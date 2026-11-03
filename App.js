import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList,
  Image, Modal, SafeAreaView, ScrollView, KeyboardAvoidingView,
  Platform, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [personality, setPersonality] = useState('');
  const [visualDesc, setVisualDesc] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [greeting, setGreeting] = useState('');
  const [generatingImg, setGeneratingImg] = useState(false);

  useEffect(() => {
    checkApiKey();
    loadCharacters();
  }, []);

  const checkApiKey = async () => {
    try {
      const savedKey = await AsyncStorage.getItem('@user_groq_key');
      if (savedKey) setApiKey(savedKey);
      else setKeyModalVisible(true);
    } catch (e) { console.log(e); }
  };

  const handleSaveApiKey = async () => {
    if (!tempApiKey.trim()) {
      Alert.alert('Atención', 'Por favor ingresa una API Key válida.');
      return;
    }
    await AsyncStorage.setItem('@user_groq_key', tempApiKey.trim());
    setApiKey(tempApiKey.trim());
    setKeyModalVisible(false);
    setTempApiKey('');
    Alert.alert('¡Listo!', 'API Key guardada en tu teléfono.');
  };

  const loadCharacters = async () => {
    try {
      const data = await AsyncStorage.getItem('@characters');
      if (data) setCharacters(JSON.parse(data));
      else {
        const initial = [{
          id: '1', name: 'Luna', tagline: 'Chica anime gamer y divertida',
          personality: 'Eres Luna, una chica gamer cariñosa, energética y bromista. Hablas con emoción y usas emojis.',
          avatarUrl: 'https://image.pollinations.ai/prompt/anime%20girl%20gamer%20purple%20hair%20portrait?width=300&height=300&nologo=true',
          greeting: '¡Hola! ¿A qué jugamos hoy?'
        }];
        setCharacters(initial);
        await AsyncStorage.setItem('@characters', JSON.stringify(initial));
      }
    } catch (e) { console.log(e); }
  };

  const handleGenerateAvatar = () => {
    if (!visualDesc.trim()) {
      Alert.alert('Falta la descripción', 'Escribe cómo debe verse el personaje.');
      return;
    }
    setGeneratingImg(true);
    const prompt = encodeURIComponent(`${visualDesc}, high quality portrait, digital art`);
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=400&height=400&nologo=true`;
    setAvatarUrl(url);
    setGeneratingImg(false);
  };

  const handleSaveCharacter = async () => {
    if (!name.trim() || !personality.trim()) {
      Alert.alert('Faltan datos', 'El personaje debe tener al menos nombre y personalidad.');
      return;
    }
    const newChar = {
      id: Date.now().toString(), name, tagline, personality,
      avatarUrl: avatarUrl || 'https://image.pollinations.ai/prompt/portrait%20character?width=300&height=300&nologo=true',
      greeting: greeting || `Hola, soy ${name}.`
    };
    const updated = [newChar, ...characters];
    setCharacters(updated);
    await AsyncStorage.setItem('@characters', JSON.stringify(updated));
    setName(''); setTagline(''); setPersonality(''); setVisualDesc('');
    setAvatarUrl(''); setGreeting(''); setModalVisible(false);
    openChat(newChar);
  };

  const openChat = async (char) => {
    setSelectedChar(char);
    const savedChat = await AsyncStorage.getItem(`@chat_${char.id}`);
    if (savedChat) setMessages(JSON.parse(savedChat));
    else setMessages([{ sender: 'character', text: char.greeting }]);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;
    if (!apiKey) {
      Alert.alert('Falta API Key', 'Debes configurar tu API Key para poder chatear.');
      setKeyModalVisible(true);
      return;
    }
    const userMsg = { sender: 'user', text: inputText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages); setInputText(''); setLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `${selectedChar.personality}\nResponde siempre como tu personaje, de manera inmersiva y entretenida.` },
            ...updatedMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
          ]
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        Alert.alert('Error de Groq', data.error?.message || `Error HTTP ${res.status}. Verifica tu API Key.`);
        return;
      }
      const replyText = data.choices?.[0]?.message?.content || '...';
      const finalChat = [...updatedMessages, { sender: 'character', text: replyText }];
      setMessages(finalChat);
      await AsyncStorage.setItem(`@chat_${selectedChar.id}`, JSON.stringify(finalChat));
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema de conexión al responder.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      {selectedChar ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedChar(null)} style={styles.backBtn}>
              <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
            </TouchableOpacity>
            <Image source={{ uri: selectedChar.avatarUrl }} style={styles.smallAvatar} />
            <Text style={styles.chatTitle}>{selectedChar.name}</Text>
          </View>
          <FlatList
            data={messages} keyExtractor={(_, index) => index.toString()}
            style={{ flex: 1, padding: 16 }}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.charBubble]}>
                <Text style={styles.bubbleText}>{item.text}</Text>
              </View>
            )}
          />
          {loading && <Text style={styles.typingText}>{selectedChar.name} está escribiendo...</Text>}
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Escribe un mensaje..." placeholderTextColor="#777"
              value={inputText} onChangeText={setInputText} />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={styles.header}>
            <Text style={styles.title}>TipsySolo</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.settingsBtn} onPress={() => setKeyModalVisible(true)}>
                <Text style={{ color: '#fff', fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList data={characters} keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.charCard} onPress={() => openChat(item)}>
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.charName}>{item.name}</Text>
                  <Text style={styles.charTagline} numberOfLines={1}>{item.tagline}</Text>
                </View>
              </TouchableOpacity>
            )} />
        </View>
      )}

      <Modal visible={keyModalVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Configurar API Key</Text>
            <Text style={styles.modalDesc}>Pega tu clave de Groq (empieza con gsk_). Se guardará en tu teléfono.</Text>
            <TextInput style={styles.keyInput} placeholder="gsk_..." placeholderTextColor="#666"
              secureTextEntry value={tempApiKey} onChangeText={setTempApiKey} autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              {apiKey ? (
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#333' }]} onPress={() => setKeyModalVisible(false)}>
                  <Text style={{ color: '#fff', textAlign: 'center' }}>Cerrar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiKey}>
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Guardar Clave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.fullModal}>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Nuevo Personaje</Text>
            <Text style={styles.label}>Nombre:</Text>
            <TextInput style={styles.formInput} placeholder="Ej: Diana" placeholderTextColor="#666" value={name} onChangeText={setName} />
            <Text style={styles.label}>Descripción corta:</Text>
            <TextInput style={styles.formInput} placeholder="Ej: Espía cyberpunk solitaria" placeholderTextColor="#666" value={tagline} onChangeText={setTagline} />
            <Text style={styles.label}>Personalidad / Rol:</Text>
            <TextInput style={[styles.formInput, { height: 80 }]} multiline
              placeholder="¿Cómo habla? ¿Qué secretos tiene? ¿Cómo debe tratarte?"
              placeholderTextColor="#666" value={personality} onChangeText={setPersonality} />
            <Text style={styles.label}>Mensaje de bienvenida:</Text>
            <TextInput style={styles.formInput} placeholder="¿Qué te dirá en el primer mensaje?" placeholderTextColor="#666" value={greeting} onChangeText={setGreeting} />
            <Text style={styles.label}>Apariencia para generar su imagen:</Text>
            <TextInput style={styles.formInput} placeholder="Ej: anime girl red hair cyberpunk neon"
              placeholderTextColor="#666" value={visualDesc} onChangeText={setVisualDesc} />
            <TouchableOpacity style={styles.genBtn} onPress={handleGenerateAvatar}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                {generatingImg ? 'Generando...' : 'Generar Imagen (IA)'}
              </Text>
            </TouchableOpacity>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.previewImage} /> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 25, marginBottom: 50 }}>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#333' }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#fff', textAlign: 'center' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCharacter}>
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Guardar Personaje</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#a855f7' },
  settingsBtn: { backgroundColor: '#1f1f2e', padding: 10, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: '#9333ea', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  charCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#181822', padding: 12, borderRadius: 16, marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  charName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  charTagline: { color: '#888', fontSize: 13, marginTop: 2 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#13131c' },
  backBtn: { paddingRight: 14 },
  smallAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  chatTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' },
  userBubble: { backgroundColor: '#9333ea', alignSelf: 'flex-end', borderTopRightRadius: 2 },
  charBubble: { backgroundColor: '#1e1e2d', alignSelf: 'flex-start', borderTopLeftRadius: 2 },
  bubbleText: { color: '#fff', fontSize: 15 },
  typingText: { color: '#888', fontStyle: 'italic', fontSize: 12, marginLeft: 20, marginBottom: 6 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#13131c' },
  input: { flex: 1, backgroundColor: '#0a0a0f', color: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 44 },
  sendBtn: { backgroundColor: '#9333ea', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  fullModal: { flex: 1, backgroundColor: '#0d0d12' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  label: { color: '#aaa', fontSize: 13, marginTop: 12, marginBottom: 4 },
  formInput: { backgroundColor: '#181822', color: '#fff', borderRadius: 10, padding: 12, fontSize: 15 },
  genBtn: { backgroundColor: '#475569', padding: 12, borderRadius: 10, marginTop: 10 },
  previewImage: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginTop: 15, borderWidth: 2, borderColor: '#9333ea' },
  saveBtn: { flex: 1, backgroundColor: '#9333ea', padding: 14, borderRadius: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#181822', width: '100%', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalHeading: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { color: '#888', fontSize: 13, marginBottom: 15 },
  keyInput: { backgroundColor: '#0a0a0f', color: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#444' }
});
