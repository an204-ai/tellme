import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ProfileScreen() {
  const { username } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Trang cá nhân @{username}</Text>
    </View>
  );
}
