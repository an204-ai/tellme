import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Chi tiết bài viết #{id}</Text>
    </View>
  );
}
