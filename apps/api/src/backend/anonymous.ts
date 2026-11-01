import { createHash } from "node:crypto";

// The post is the scope of an identity, never the author's account.
// Old posts get the same persona without a database migration or extra writes.
const originalPersonas = [
  ["Mèo muốn ngủ", "cat"], ["Mèo mê cà phê", "cat"],
  ["Mèo mơ màng", "cat"], ["Mèo mong tan ca", "cat"],
  ["Cá vàng vui vẻ", "fish"], ["Cá nhỏ chill chill", "fish"],
  ["Cá con chờ cơm", "fish"], ["Cá vàng ghé chơi", "fish"],
  ["Họa mi hay hót", "nightingale"], ["Chim sẻ chăm chỉ", "sparrow"],
  ["Cú mèo mê cà phê", "owl"], ["Chim non ngóng nắng", "bird"],
  ["Thỏ nhỏ ham vui", "rabbit"], ["Thỏ trắng thong thả", "rabbit"],
  ["Thỏ thèm trà sữa", "rabbit"], ["Thỏ vừa tan ca", "rabbit"],
  ["Rùa rảnh rang", "turtle"], ["Rùa vừa tan ca", "turtle"],
  ["Rùa rủ rê", "turtle"], ["Rùa thích nghỉ trưa", "turtle"],
  ["Sóc thích ăn vặt", "squirrel"], ["Sóc xinh xắn", "squirrel"],
  ["Sóc ngóng cơm trưa", "squirrel"], ["Sóc sắp tan ca", "squirrel"],
  ["Cún con chăm chỉ", "dog"], ["Cún chờ cơm trưa", "dog"],
  ["Cún con kể chuyện", "dog"], ["Cún thích cuối tuần", "dog"],
] as const;
// Append species without changing the names already assigned to older posts.
const currentPersonas = [
  ...originalPersonas,
  ["Gấu nâu ngóng lương", "bear"], ["Gấu bông buồn ngủ", "bear"],
  ["Gấu nhỏ nhâm nhi", "bear"], ["Gấu vừa tan ca", "bear"],
  ["Rái cá tan ca", "otter"], ["Rái cá rảnh rang", "otter"],
  ["Rái cá mê trà", "otter"], ["Rái cá chờ cơm", "otter"],
  ["Cáo nhỏ tò mò", "fox"], ["Cáo cam chăm chỉ", "fox"],
  ["Cáo con kể chuyện", "fox"], ["Cáo chờ cuối tuần", "fox"],
  ["Ếch xanh ham vui", "frog"], ["Ếch nhỏ nghe mưa", "frog"],
  ["Ếch chờ cơm trưa", "frog"], ["Ếch vừa tan ca", "frog"],
  ["Cánh cụt thích chill", "penguin"], ["Cánh cụt chờ tan ca", "penguin"],
  ["Cánh cụt mê cà phê", "penguin"], ["Cánh cụt ngóng gió", "penguin"],
  ["Cú nhỏ thức khuya", "owl"], ["Cú mèo chờ tan ca", "owl"],
  ["Cú nâu kể chuyện", "owl"],
] as const;
const colors = ["lavender", "mint", "peach", "sky", "sand", "rose"] as const;

export function anonymousIdentity(postId: string, version: 1 | 2 = 1) {
  const personas = version === 2 ? currentPersonas : originalPersonas;
  const hash = createHash("sha256").update(`tellme:post-persona:v${version}:${postId}`).digest();
  const [name, animal] = personas[hash.readUInt32BE(0) % personas.length]!;
  return { name, animal, color: colors[hash[4]! % colors.length]! };
}
