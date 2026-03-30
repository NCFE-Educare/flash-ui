import type { ChatMessage } from './api';

/**
 * Dynamically loads the jsPDF library from a CDN at runtime.
 * This ensures it remains strictly on the client-side and avoids 
 * static rendering errors during the build/bundling phase.
 */
async function loadJsPDF(): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  if ((window as any).jspdf) {
    return (window as any).jspdf.jsPDF;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).jspdf) {
        resolve((window as any).jspdf.jsPDF);
      } else {
        reject(new Error("jsPDF loaded but namespace not found on window."));
      }
    };
    script.onerror = () => reject(new Error("Failed to load jsPDF script from CDN."));
    document.head.appendChild(script);
  });
}

export async function exportChatToPDF(
  messages: ChatMessage[],
  username: string
) {
  if (typeof window === 'undefined') return;

  try {
    const jsPDFClass = await loadJsPDF();
    if (!jsPDFClass) throw new Error("PDF library could not be loaded on this environment.");
    
    const doc = new jsPDFClass();
    
    // -- Header --
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Cortex Chat Export", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);
    
    let y = 45;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    
    messages.forEach((msg) => {
      if (msg.role !== 'user' && msg.role !== 'assistant') return;
      
      const isUser = msg.role === 'user';
      const name = isUser ? (username || 'USER') : 'CORTEX';
      
      // CHECK PAGE BREAK
      if (y > 260) {
         doc.addPage();
         y = 20;
      }

      // ROLE HEADER
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(isUser ? 100 : 0, isUser ? 100 : 80, isUser ? 100 : 180); 
      doc.text(name.toUpperCase(), margin, y);
      y += 6;

      // THINKING (if assistant)
      if (msg.thinking && !isUser) {
         doc.setFont("helvetica", "italic");
         doc.setFontSize(9);
         doc.setTextColor(120);
         const thinkLines = doc.splitTextToSize(`Thinking process: ${msg.thinking}`, contentWidth - 10);
         doc.text(thinkLines, margin + 5, y);
         y += (thinkLines.length * 5) + 5;
         
         if (y > 275) { doc.addPage(); y = 20; }
      }

      // CONTENT
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0);
      const textLines = doc.splitTextToSize(msg.content || "", contentWidth);
      doc.text(textLines, margin, y);
      y += (textLines.length * 6) + 12;
    });

    doc.save('cortex_chat_session.pdf');
    return true;
  } catch (err) {
    console.error("PDF Export Error:", err);
    throw err;
  }
}
