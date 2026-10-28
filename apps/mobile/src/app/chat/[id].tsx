import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Hội thoại #{id}</Text>
    </View>
  );
}
