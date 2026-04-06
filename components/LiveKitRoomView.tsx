import React from 'react';
import { 
  LiveKitRoom, 
  VideoConference, 
  formatChatMessageLinks, 
  LocalUserChoices,
  PreJoin
} from '@livekit/components-react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '@livekit/components-styles/dist/general/index.css';

interface LiveKitRoomViewProps {
  token: string;
  url: string;
  onLeave: () => void;
}

export default function LiveKitRoomView({ token, url, onLeave }: LiveKitRoomViewProps) {
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff' }}>LiveKit Video is only supported on Web currently.</Text>
        <TouchableOpacity onPress={onLeave} style={styles.leaveBtn}>
          <Text style={{ color: '#fff' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onLeave} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backText}>Exit Room</Text>
        </TouchableOpacity>
      </View>
      
      <div className="lk-video-container" style={{ height: 'calc(100% - 60px)', width: '100%' }}>
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={url}
          connect={true}
          onDisconnected={onLeave}
          data-lk-theme="default"
        >
          <VideoConference chatMessageFormatter={formatChatMessageLinks} />
        </LiveKitRoom>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .lk-video-conference {
          height: 100% !important;
          background-color: #111 !important;
          color: #fff !important;
        }
        .lk-control-bar {
          background-color: rgba(32, 33, 36, 0.9) !important;
          border-top: none !important;
          padding: 12px !important;
          justify-content: center !important;
          gap: 12px !important;
        }
        .lk-button {
          border-radius: 8px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          background-color: #3c4043 !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: background-color 0.2s !important;
        }
        /* Hide text labels for icon-only Google Meet look */
        .lk-button > span {
          display: none !important;
        }
        .lk-button:hover {
          background-color: #43474b !important;
        }
        .lk-button-destructive {
          background-color: #ea4335 !important;
        }
        .lk-button-destructive:hover {
          background-color: #d93025 !important;
        }
        .lk-video-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
        }
        .lk-participant-tile {
            border-radius: 12px !important;
            overflow: hidden !important;
        }
      `}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#202124',
    borderBottomWidth: 1,
    borderBottomColor: '#3c4043',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.semibold,
  },
  leaveBtn: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  }
});

// Since we use global Fonts constant from theme, we need to import it
import { Fonts } from '../constants/theme';
