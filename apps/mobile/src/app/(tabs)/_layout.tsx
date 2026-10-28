import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="feed" options={{ title: "Bảng tin" }} />
      <Tabs.Screen name="explore" options={{ title: "Khám phá" }} />
      <Tabs.Screen name="today" options={{ title: "Hôm nay" }} />
      <Tabs.Screen name="messages" options={{ title: "Tin nhắn" }} />
      <Tabs.Screen name="profile" options={{ title: "Cá nhân" }} />
    </Tabs>
  );
}
