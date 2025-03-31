import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface DropdownProps {
  data: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function Dropdown({ data, value, onChange, placeholder = 'Select option' }: DropdownProps) {
  const [visible, setVisible] = useState(false);
  
  const selectedItem = data.find(item => item.value === value);
  const displayText = selectedItem ? selectedItem.label : placeholder;
  
  const toggleDropdown = () => {
    setVisible(!visible);
  };
  
  const onItemPress = (value: string) => {
    onChange(value);
    setVisible(false);
  };
  
  const renderItem = ({ item }: { item: { label: string; value: string } }) => (
    <TouchableOpacity 
      style={[
        styles.item, 
        item.value === value && styles.selectedItem
      ]} 
      onPress={() => onItemPress(item.value)}
    >
      <Text style={[
        styles.itemText,
        item.value === value && styles.selectedItemText
      ]}>
        {item.label}
      </Text>
      {item.value === value && (
        <MaterialIcons name="check" size={18} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.dropdownButton} 
        onPress={toggleDropdown}
      >
        <Text style={[
          styles.buttonText,
          !selectedItem && styles.placeholderText
        ]}>
          {displayText}
        </Text>
        <MaterialIcons 
          name={visible ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={24} 
          color={theme.colors.text.secondary} 
        />
      </Pressable>
      
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownContainer}>
              <View style={styles.header}>
                <Text style={styles.headerText}>{placeholder}</Text>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <MaterialIcons name="close" size={22} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={(item) => item.value}
                bounces={false}
                contentContainerStyle={styles.listContainer}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    height: 48,
  },
  buttonText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  placeholderText: {
    color: theme.colors.text.secondary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.surface,
    width: '100%',
    maxHeight: 400,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  listContainer: {
    paddingVertical: theme.spacing.xs,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  selectedItem: {
    backgroundColor: theme.colors.primary + '10',
  },
  itemText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  selectedItemText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
}); 