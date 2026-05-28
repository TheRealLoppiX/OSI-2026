import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Falha ao obter permissão para push!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: "eab8df45-63f6-441f-a7d9-d1cb322034bb",
    })).data;

    if (token && userId) {
      const { error } = await supabase
        .from('usuarios')
        .update({ push_token: token })
        .eq('id', userId);
      
      if (error) console.error("Erro ao salvar push_token:", error.message);
    }
  } else {
    console.log('Notificações só funcionam em aparelhos reais (não emuladores)');
  }

  return token;
}