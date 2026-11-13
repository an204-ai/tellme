import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs initialRouteName="today" screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="today" options={{ title: "Tell me now" }} />
      <Tabs.Screen name="messages" options={{ title: "Tin nhắn" }} />
      <Tabs.Screen name="profile" options={{ title: "Cá nhân" }} />
    </Tabs>
  );
}
