import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

/**
 * Browser modal for the existing controller dialogs. Native screens continue to use their original native library browser screens use React Native Web's Modal.
 */
export default function ControllerModal(props) {
  if (!props.isVisible) {
    return null;
  }

  function closeModal() {
    if (props.onRequestClose) {
      props.onRequestClose();
    } else if (props.onBackdropPress) {
      props.onBackdropPress();
    }
  }

  return (
    <Modal visible={props.isVisible} transparent animationType="fade" onRequestClose={closeModal}>
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        paddingHorizontal: 12,
        paddingVertical: 20
      }}>
        <Pressable
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          onPress={closeModal}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <View style={{
          width: '100%',
          maxWidth: 860,
          maxHeight: '94%',
          minHeight: 210,
          borderRadius: 18,
          backgroundColor: '#5D6061',
          paddingHorizontal: 14,
          paddingVertical: 14
        }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {props.children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
