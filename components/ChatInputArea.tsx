import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Fonts } from "../constants/theme";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../context/ThemeContext";
import { fileApi, documentApi, integrationsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Supported document MIME types / extensions
const SUPPORTED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
];
const SUPPORTED_DOC_EXTS = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".txt"];

interface SelectedDoc {
  name: string;
  size: number;
  file: File; // web File object
}

interface ChatInputAreaProps {
  onSend(text: string, imageUrls?: string[], documentUrls?: string[]): void;
  isGenerating?: boolean;
  onStop?: () => void;
}

export default function ChatInputArea({
  onSend,
  isGenerating,
  onStop,
}: ChatInputAreaProps) {
  const r = useResponsive();
  const { colors } = useTheme();
  const { token } = useAuth();

  const [text, setText] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<SelectedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [docBarHovered, setDocBarHovered] = useState(false);

  // Hidden file input ref for documents (web)
  const docInputRef = useRef<any>(null);

  const hasText = text.trim().length > 0;
  const canSend =
    (hasText || selectedImages.length > 0 || selectedDocs.length > 0) &&
    !isGenerating;

  // Horizontal padding adapts to screen size
  const hPad = r.isDesktop ? 100 : r.isTablet ? 40 : 12;

  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [inputHeight, setInputHeight] = useState(46);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [docsConnected, setDocsConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [slidesConnected, setSlidesConnected] = useState(false);
  const [formsConnected, setFormsConnected] = useState(false);
  const [meetConnected, setMeetConnected] = useState(false);
  const [isCheckingIntegrations, setIsCheckingIntegrations] = useState(false);

  const checkIntegrations = async () => {
    if (!token) return;
    setIsCheckingIntegrations(true);
    try {
      const g = await integrationsApi.gmailStatus(token);
      setGmailConnected(!!g);
      const s = await integrationsApi.sheetsStatus(token);
      setSheetsConnected(!!s);
      const d = await integrationsApi.docsStatus(token);
      setDocsConnected(!!d);
      const dr = await integrationsApi.driveStatus(token);
      setDriveConnected(!!dr);
      const c = await integrationsApi.calendarStatus(token);
      setCalendarConnected(!!c);
      const sl = await integrationsApi.slidesStatus(token);
      setSlidesConnected(!!sl);
      const f = await integrationsApi.formsStatus(token);
      setFormsConnected(!!f);
      const m = await integrationsApi.meetStatus(token);
      setMeetConnected(!!m);
    } catch (e) {
      console.error("Error checking integrations", e);
    } finally {
      setIsCheckingIntegrations(false);
    }
  };

  const toggleIntegrations = () => {
    if (!showIntegrations) {
      checkIntegrations();
    }
    setShowIntegrations(!showIntegrations);
  };

  const handleGmailAction = async () => {
    if (!token) return;
    if (gmailConnected) {
      await integrationsApi.gmailDisconnect(token);
      setGmailConnected(false);
    } else {
      try {
        const res = await integrationsApi.gmailConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Gmail", e.message);
      }
    }
  };

  const handleSheetsAction = async () => {
    if (!token) return;
    if (sheetsConnected) {
      await integrationsApi.sheetsDisconnect(token);
      setSheetsConnected(false);
    } else {
      try {
        const res = await integrationsApi.sheetsConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Sheets", e.message);
      }
    }
  };

  const handleFormsAction = async () => {
    if (!token) return;
    if (formsConnected) {
      await integrationsApi.formsDisconnect(token);
      setFormsConnected(false);
    } else {
      try {
        const res = await integrationsApi.formsConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Forms", e.message);
      }
    }
  };

  const handleDocsAction = async () => {
    if (!token) return;
    if (docsConnected) {
      await integrationsApi.docsDisconnect(token);
      setDocsConnected(false);
    } else {
      try {
        const res = await integrationsApi.docsConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Docs", e.message);
      }
    }
  };

  const handleDriveAction = async () => {
    if (!token) return;
    if (driveConnected) {
      await integrationsApi.driveDisconnect(token);
      setDriveConnected(false);
    } else {
      try {
        const res = await integrationsApi.driveConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Drive", e.message);
      }
    }
  };

  const handleCalendarAction = async () => {
    if (!token) return;
    if (calendarConnected) {
      await integrationsApi.calendarDisconnect(token);
      setCalendarConnected(false);
    } else {
      try {
        const res = await integrationsApi.calendarConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Calendar", e.message);
      }
    }
  };

  const handleMeetAction = async () => {
    if (!token) return;
    if (meetConnected) {
      await integrationsApi.meetDisconnect(token);
      setMeetConnected(false);
    } else {
      try {
        const res = await integrationsApi.meetConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Meet", e.message);
      }
    }
  };

  const handleSlidesAction = async () => {
    if (!token) return;
    if (slidesConnected) {
      await integrationsApi.slidesDisconnect(token);
      setSlidesConnected(false);
    } else {
      try {
        const res = await integrationsApi.slidesConnect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting Slides", e.message);
      }
    }
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImages((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ]);
    }
  };

  // ── Document picker (web only via hidden <input type="file">) ──
  const handlePickDocument = () => {
    if (Platform.OS === "web") {
      docInputRef.current?.click();
    } else {
      Alert.alert(
        "Not supported",
        "Document upload is currently only available on web.",
      );
    }
  };

  const handleDocFileChange = (e: any) => {
    const files: FileList = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: SelectedDoc[] = [];
    const rejected: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const validMime = SUPPORTED_DOC_TYPES.includes(file.type);
      const validExt = SUPPORTED_DOC_EXTS.includes(ext);

      if (!validMime && !validExt) {
        rejected.push(file.name);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        Alert.alert("File too large", `${file.name} exceeds the 20 MB limit.`);
        continue;
      }
      if (selectedDocs.length + newDocs.length >= 5) {
        Alert.alert(
          "Limit reached",
          "You can attach a maximum of 5 documents.",
        );
        break;
      }
      newDocs.push({ name: file.name, size: file.size, file });
    }

    if (rejected.length > 0) {
      Alert.alert(
        "Unsupported format",
        `Only PDF, DOCX, PPTX, PPT, TXT are allowed.\nRejected: ${rejected.join(", ")}`,
      );
    }

    if (newDocs.length > 0) {
      setSelectedDocs((prev) => [...prev, ...newDocs]);
    }

    // Reset the input so the same file can be re-picked
    e.target.value = "";
  };

  const removeDoc = (index: number) => {
    setSelectedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!canSend || isUploading || isGenerating) return;

    let uploadedImageUrls: string[] | undefined;
    let uploadedDocUrls: string[] | undefined;

    setIsUploading(true);

    try {
      // Upload images
      if (selectedImages.length > 0 && token) {
        const res = await fileApi.upload(token, selectedImages);
        uploadedImageUrls = res.image_urls;
      }

      // Upload documents
      if (selectedDocs.length > 0 && token) {
        const res = await documentApi.upload(
          token,
          selectedDocs.map((d) => d.file),
        );
        uploadedDocUrls = res.document_urls;
      }
    } catch (err: any) {
      Alert.alert("Upload failed", err.message || "Could not upload files");
      setIsUploading(false);
      return;
    }

    setIsUploading(false);
    onSend(text.trim(), uploadedImageUrls, uploadedDocUrls);
    setText("");
    setSelectedImages([]);
    setSelectedDocs([]);
  };

  // ── Handle Web Paste Events ──
  React.useEffect(() => {
    if (Platform.OS !== "web") return;

    const handlePaste = (e: any) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      let addedImgs: string[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            addedImgs.push(url);
          }
        }
      }
      if (addedImgs.length > 0) {
        setSelectedImages((prev) => [...prev, ...addedImgs]);
        e.preventDefault();
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocIcon = (name: string): any => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "document-text-outline";
    if (ext === "docx" || ext === "doc") return "document-outline";
    if (ext === "pptx" || ext === "ppt") return "easel-outline";
    return "document-outline";
  };

  const s = getStyles(colors);

  return (
    <View style={[s.wrapper, { paddingHorizontal: hPad }]}>
      {/* Hidden web file input for documents */}
      {Platform.OS === "web" && (
        <input
          ref={docInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
          style={{ display: "none" }}
          onChange={handleDocFileChange}
        />
      )}

      {/* Main input box */}
      <View style={s.container}>
        {/* Image previews */}
        {selectedImages.length > 0 && (
          <View style={s.previewContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {selectedImages.map((uri, index) => (
                <View key={index} style={{ position: "relative" }}>
                  <Image source={{ uri }} style={s.previewImage} />
                  <TouchableOpacity
                    style={s.removeImageBtn}
                    onPress={() => removeImage(index)}
                    disabled={isUploading}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Document previews */}
        {selectedDocs.length > 0 && (
          <View style={s.docPreviewContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {selectedDocs.map((doc, index) => (
                <View key={index} style={s.docChip}>
                  <Ionicons
                    name={getDocIcon(doc.name)}
                    size={14}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.docChipName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={s.docChipSize}>{formatBytes(doc.size)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeDoc(index)}
                    disabled={isUploading}
                    style={{ padding: 2 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.textSubtle}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <TextInput
          style={[
            s.input,
            { height: text ? Math.max(46, Math.min(inputHeight, 300)) : 46 }
          ]}
          placeholder="Ask me anything..."
          placeholderTextColor={colors.textSubtle}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
          editable={!isUploading}
          onContentSizeChange={(e) => {
            // Calculate the new height dynamically, clamping it appropriately
            setInputHeight(e.nativeEvent.contentSize.height);
          }}
        />

        {/* Toolbar row 1: chips + send */}
        <View style={s.toolbar1}>
          {r.isMobile && (
            <TouchableOpacity
              style={s.toolbarBtn}
              activeOpacity={0.7}
              onPress={() => setShowMobileMenu(!showMobileMenu)}
              disabled={isUploading}
            >
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
          {!r.isMobile && (
            <TouchableOpacity
              style={s.toolbarBtn}
              activeOpacity={0.7}
              onPress={handlePickImage}
              disabled={isUploading}
            >
              <Ionicons
                name="image-outline"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
          {!r.isMobile && <ToolbarBtn icon="bulb-outline" colors={colors} />}
          <View style={{ flex: 1 }} />
          {r.isDesktop && (
            <TouchableOpacity
              style={s.toolbarBtn}
              activeOpacity={0.7}
              onPress={toggleIntegrations}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
          <View style={{ width: 6 }} />
          {/* Send / Stop button */}
          <TouchableOpacity
            onPress={isGenerating ? onStop : handleSend}
            activeOpacity={0.85}
            disabled={isUploading || (!canSend && !isGenerating)}
          >
            {isGenerating ? (
              <View
                style={[s.sendBtn, { backgroundColor: colors.surfaceHover }]}
              >
                <Ionicons
                  name="stop"
                  size={16}
                  color={(colors as any).textError || "#ff4444"}
                />
              </View>
            ) : isUploading ? (
              <View
                style={[s.sendBtn, { backgroundColor: colors.surfaceHover }]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : canSend ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={s.sendBtn}
              >
                <Ionicons name="arrow-up" size={16} color="#fff" />
              </LinearGradient>
            ) : (
              <View
                style={[s.sendBtn, { backgroundColor: colors.surfaceHover }]}
              >
                <Ionicons name="arrow-up" size={16} color={colors.textSubtle} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Toolbar row 2: "Chat with Documents" + attach button */}
        {!r.isMobile && (
          <TouchableOpacity
            style={[s.toolbar2, docBarHovered && s.toolbar2Hovered]}
            activeOpacity={0.85}
            onPress={handlePickDocument}
            disabled={isUploading}
            // @ts-ignore – web only
            onMouseEnter={() => setDocBarHovered(true)}
            onMouseLeave={() => setDocBarHovered(false)}
          >
            {Platform.OS === "web" && (
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                                @keyframes docSparkle {
                                    0%   { transform: scale(1) rotate(0deg); opacity: 1; }
                                    30%  { transform: scale(1.35) rotate(-12deg); opacity: 0.9; }
                                    60%  { transform: scale(1.1) rotate(8deg); opacity: 1; }
                                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                                }
                                @keyframes attachSlide {
                                    0%   { opacity: 0; transform: translateX(4px); }
                                    100% { opacity: 1; transform: translateX(0px); }
                                }
                            `,
                }}
              />
            )}
            <div
              style={
                Platform.OS === "web"
                  ? {
                    display: "flex",
                    animation: docBarHovered
                      ? "docSparkle 0.55s ease forwards"
                      : "none",
                  }
                  : undefined
              }
            >
              <Ionicons
                name="sparkles"
                size={13}
                color={docBarHovered ? colors.primary : colors.primary}
              />
            </div>
            <Text
              style={[s.savedText, docBarHovered && { color: colors.text }]}
            >
              Chat with Documents
            </Text>
            <View style={{ flex: 1 }} />
            <div
              style={
                Platform.OS === "web"
                  ? {
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    animation: docBarHovered
                      ? "attachSlide 0.2s ease forwards"
                      : "none",
                  }
                  : undefined
              }
            >
              <Ionicons
                name="attach-outline"
                size={13}
                color={
                  selectedDocs.length > 0
                    ? colors.primary
                    : docBarHovered
                      ? colors.primary
                      : colors.textMuted
                }
              />
              <Text
                style={[
                  s.attachText,
                  (selectedDocs.length > 0 || docBarHovered) && {
                    color: colors.primary,
                  },
                ]}
              >
                {selectedDocs.length > 0
                  ? `${selectedDocs.length} attached`
                  : "Attach file"}
              </Text>
            </div>
          </TouchableOpacity>
        )}
      </View>

      <IntegrationsMenu
        visible={showIntegrations}
        onClose={() => setShowIntegrations(false)}
        colors={colors}
        gmailConnected={gmailConnected}
        sheetsConnected={sheetsConnected}
        docsConnected={docsConnected}
        driveConnected={driveConnected}
        calendarConnected={calendarConnected}
        slidesConnected={slidesConnected}
        formsConnected={formsConnected}
        meetConnected={meetConnected}
        onGmailAction={handleGmailAction}
        onSheetsAction={handleSheetsAction}
        onDocsAction={handleDocsAction}
        onDriveAction={handleDriveAction}
        onCalendarAction={handleCalendarAction}
        onSlidesAction={handleSlidesAction}
        onFormsAction={handleFormsAction}
        onMeetAction={handleMeetAction}
        loading={isCheckingIntegrations}
        hPad={hPad}
      />

      {showMobileMenu && r.isMobile && (
        <View style={s.mobileMenuContainer}>
          <TouchableOpacity
            style={s.mobileMenuItem}
            onPress={() => {
              setShowMobileMenu(false);
              handlePickImage();
            }}
          >
            <Ionicons name="image-outline" size={20} color={colors.text} />
            <Text style={s.mobileMenuText}>Attach Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.mobileMenuItem}
            onPress={() => {
              setShowMobileMenu(false);
              handlePickDocument();
            }}
          >
            <Ionicons name="document-outline" size={20} color={colors.text} />
            <Text style={s.mobileMenuText}>Attach Document</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mobileMenuItem, { borderBottomWidth: 0 }]}
            onPress={() => {
              setShowMobileMenu(false);
              toggleIntegrations();
            }}
          >
            <Ionicons name="grid-outline" size={20} color={colors.text} />
            <Text style={s.mobileMenuText}>Integrations</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ModeChip({
  icon,
  label,
  active,
  colors,
}: {
  icon: string;
  label: string;
  active?: boolean;
  colors: any;
}) {
  const s = getStyles(colors);
  return (
    <View style={[s.chip, active && s.chipActive]}>
      <Ionicons
        name={icon as any}
        size={12}
        color={active ? colors.primary : colors.textMuted}
      />
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </View>
  );
}

function ToolbarBtn({ icon, colors }: { icon: string; colors: any }) {
  const s = getStyles(colors);
  return (
    <TouchableOpacity style={s.toolbarBtn} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function IntegrationsMenu({
  visible,
  onClose,
  colors,
  gmailConnected,
  sheetsConnected,
  docsConnected,
  driveConnected,
  calendarConnected,
  slidesConnected,
  formsConnected,
  meetConnected,
  onGmailAction,
  onSheetsAction,
  onDocsAction,
  onDriveAction,
  onCalendarAction,
  onSlidesAction,
  onFormsAction,
  onMeetAction,
  loading,
  hPad,
}: any) {
  if (!visible) return null;
  const s = getIntegrationsStyles(colors, hPad);
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Integrations</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="close" size={20} color={colors.textSubtle} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
      ) : (
        <>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/gmail-new.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Gmail</Text>
            </View>
            {gmailConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onGmailAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onGmailAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-sheets.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Sheets</Text>
            </View>
            {sheetsConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onSheetsAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onSheetsAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-docs.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Docs</Text>
            </View>
            {docsConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onDocsAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onDocsAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-drive--v1.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Drive</Text>
            </View>
            {driveConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onDriveAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onDriveAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-calendar--v2.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Calendar</Text>
            </View>
            {calendarConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onCalendarAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onCalendarAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-slides.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Slides</Text>
            </View>
            {slidesConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onSlidesAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onSlidesAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-forms.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Forms</Text>
            </View>
            {formsConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onFormsAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onFormsAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.item}>
            <View style={s.itemLeft}>
              <Image
                source={{
                  uri: "https://img.icons8.com/color/48/google-meet--v1.png",
                }}
                style={{ width: 22, height: 22 }}
              />
              <Text style={s.itemText}>Google Meet</Text>
            </View>
            {meetConnected ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={s.activeBadge}>
                  <View style={s.activeDot} />
                  <Text style={s.activeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onMeetAction} style={s.iconBtn}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textError || "#ff4444"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.btn, s.btnConnect]}
                onPress={onMeetAction}
              >
                <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const getIntegrationsStyles = (colors: any, hPad: number) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 125,
      right: hPad + 40,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDark,
      padding: 12,
      width: 290,
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      zIndex: 1000,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    title: { fontSize: 16, fontFamily: Fonts.semibold, color: colors.text },
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    itemText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.text },
    btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    btnConnect: { backgroundColor: colors.primary },
    btnText: { fontSize: 12, fontFamily: Fonts.medium },
    btnTextConnect: { color: "#fff" },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#22c55e",
    },
    activeText: { fontSize: 12, fontFamily: Fonts.medium, color: "#22c55e" },
    iconBtn: { padding: 4 },
  });

const getStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background,
      paddingTop: 0,
      paddingBottom: Platform.OS === "ios" ? 24 : 14,
    },
    container: {
      borderWidth: 1,
      borderColor: colors.borderDark,
      borderRadius: 16,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    mobileMenuContainer: {
      position: "absolute",
      bottom: 80,
      left: 16,
      backgroundColor: colors.surfaceHover,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderDark,
      width: 220,
      elevation: 5,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 10,
      zIndex: 1000,
      overflow: "hidden",
    },
    mobileMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDark,
      gap: 12,
    },
    mobileMenuText: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: colors.text,
    },
    input: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: colors.text,
      minHeight: 46,
      maxHeight: 300,
      // @ts-ignore – web only
      outlineWidth: 0,
      transition: "height 0.2s ease",
    },
    toolbar1: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 2,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primaryBg,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
    },
    chipTextActive: { color: colors.primary },
    toolbarBtn: { padding: 5 },
    sendBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    toolbar2: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.surfaceSecondary,
      borderTopWidth: 1,
      borderTopColor: colors.borderDark,
      gap: 5,
      // @ts-ignore – web only
      transition: "background-color 0.2s ease, border-color 0.2s ease",
      cursor: "pointer",
    },
    toolbar2Hovered: {
      backgroundColor: colors.primaryBg,
      borderTopColor: colors.primary + "55",
    },
    savedText: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
    },
    attachText: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: colors.textSubtle,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingHorizontal: 4,
    },
    footerText: {
      flex: 1,
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: colors.textSubtle,
    },
    discordLink: {
      color: colors.primary,
      fontFamily: Fonts.medium,
      textDecorationLine: "underline",
    },
    previewContainer: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDark,
      position: "relative",
      alignSelf: "flex-start",
    },
    previewImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: colors.surfaceSecondary,
    },
    removeImageBtn: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    // Document chip styles
    docPreviewContainer: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDark,
    },
    docChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primaryBg,
      borderWidth: 1,
      borderColor: colors.primary + "44",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      maxWidth: 180,
    },
    docChipName: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: colors.text,
      maxWidth: 110,
    },
    docChipSize: {
      fontSize: 10,
      fontFamily: Fonts.regular,
      color: colors.textSubtle,
    },
  });
