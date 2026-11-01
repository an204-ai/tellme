export type WeatherReport = {
  place: string; observedAt: number; fetchedAt: number; timezone: number;
  temperature: number; feelsLike: number; humidity: number; windKph: number;
  conditionId: number; description: string; icon: string; rainMm: number;
  forecast: { at: number; temperature: number; conditionId: number; icon: string; rainChance: number | null }[];
  forecastAvailable: boolean; stale: boolean;
};
export type WeatherMood = "storm" | "rain" | "snow" | "haze" | "wind" | "hot" | "cool" | "cloud" | "clear" | "night";
export function weatherMood(report: WeatherReport): WeatherMood {
  const id = report.conditionId;
  if (id >= 200 && id < 300) return "storm";
  if (id >= 300 && id < 600 || report.rainMm > 0) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "haze";
  if (report.windKph >= 35) return "wind";
  if (report.feelsLike >= 33) return "hot";
  if (report.feelsLike <= 19) return "cool";
  if (report.icon.endsWith("n")) return "night";
  if (id > 800) return "cloud";
  return "clear";
}
const voices: Record<WeatherMood, { tip: string; food: string; feed: string; moment: string; caption: string }> = {
  storm: { tip: "Trời đang có dông. Nếu chưa cần ra ngoài, ngồi lại kể chuyện với tụi mình nhé.", food: "Một tô phở nóng, ăn trong quán cho ấm bụng.", feed: "Ngoài kia có dông, trong ca làm có chuyện gì?", moment: "Ngoài kia có dông, góc làm việc của bạn thế nào?", caption: "Một khoảnh khắc trong lúc trú mưa…" },
  rain: { tip: "Mưa rồi, nhớ ô hoặc áo mưa trước khi ra ngoài nha. Đi làm về không cần vội.", food: "Bữa trưa thử một tô bún nóng nhé?", feed: "Mưa thế này, ca làm của bạn có gì để kể?", moment: "Ghi lại một chút ngày mưa ở chỗ làm nhé?", caption: "Một chút ngày mưa, một chút chuyện đi làm…" },
  snow: { tip: "Có tuyết, nhớ mặc ấm và xem đường trước khi ra ngoài nha.", food: "Một phần súp nóng hợp với hôm nay đó.", feed: "Ngày lạnh thế này, chuyện đi làm có gì ấm áp?", moment: "Lưu một góc ngày lạnh ở chỗ làm nhé?", caption: "Điều nhỏ làm ngày lạnh ấm hơn…" },
  haze: { tip: "Tầm nhìn có thể hạn chế. Ra ngoài chậm một chút, chuyện hay vẫn đợi bạn về kể.", food: "Một bữa cơm quen ở gần chỗ làm cũng ổn nè.", feed: "Ngoài trời hơi mờ, kể một chuyện rõ vui hôm nay đi?", moment: "Có góc nào ở chỗ làm đáng lưu lại không?", caption: "Một góc quen trong ngày hôm nay…" },
  wind: { tip: "Gió khá mạnh, giữ chắc mũ và đồ mang theo lúc đi đường nha.", food: "Ghé một quán quen, ăn trưa thong thả một chút.", feed: "Gió ngoài kia, chuyện gì ở chỗ làm hôm nay?", moment: "Một khoảnh khắc trước giờ tan làm nhé?", caption: "Một ngày nhiều gió, một chuyện nhỏ ở chỗ làm…" },
  hot: { tip: "Hôm nay khá nóng. Nhớ mang nước, tìm chỗ râm khi ra ngoài nha.", food: "Cơm cuốn hay một phần gỏi cuốn cho bữa trưa nhẹ nhàng?", feed: "Trời nóng vậy, ca làm có gì hạ nhiệt không?", moment: "Ly nước giờ nghỉ hay góc mát nào đáng khoe?", caption: "Một chút mát lành giữa ca làm…" },
  cool: { tip: "Trời hơi se lạnh. Mang thêm áo mỏng, nhất là ngồi phòng máy lạnh cả ngày nha.", food: "Hôm nay một tô mì nóng nghe hợp ghê.", feed: "Trời se lạnh, có chuyện gì ấm lòng ở chỗ làm?", moment: "Cốc nước ấm hay góc làm việc hôm nay thế nào?", caption: "Một ngày se lạnh ở chỗ làm…" },
  cloud: { tip: "Trời nhiều mây, một khoảng nghỉ ngắn ngoài trời nghe cũng được đó.", food: "Bữa trưa rủ đồng nghiệp ăn món quen nhé?", feed: "Trời dịu rồi, kể một chút chuyện trong ca làm đi?", moment: "Chụp một góc ngày đi làm hôm nay nhé?", caption: "Một ngày dịu trời, một khoảnh khắc muốn giữ…" },
  clear: { tip: "Trời đang đẹp. Nếu tiện, dành một chút giờ nghỉ hít thở rồi về kể tụi mình nghe.", food: "Rủ đồng nghiệp đổi quán cơm trưa hôm nay xem?", feed: "Trời đẹp vậy, hôm nay đi làm có gì vui?", moment: "Có chút nắng nào ghé góc làm việc của bạn không?", caption: "Chút nắng và chút chuyện đi làm hôm nay…" },
  night: { tip: "Tối rồi. Ai tan ca thì về thong thả, ai còn làm thì nhớ nghỉ tay một chút nha.", food: "Nếu chưa ăn, một bữa tối ấm bụng rồi hãy tiếp tục nhé.", feed: "Tan ca chưa? Kể một chuyện của ngày hôm nay đi.", moment: "Lưu một khoảnh khắc trước khi khép lại ngày nhé?", caption: "Khép lại hôm nay bằng một khoảnh khắc…" },
};
export function weatherVoice(report: WeatherReport, now = Date.now()) {
  const mood = weatherMood(report), voice = voices[mood];
  const rainSoon = report.forecast.find((item) => item.at > now && item.at - now <= 12 * 3600000 && item.rainChance !== null && item.rainChance >= .5 && item.conditionId >= 200 && item.conditionId < 600);
  return { mood, ...voice, tip: rainSoon && !["storm", "rain", "snow"].includes(mood) ? "Vài giờ tới có khả năng mưa. Bỏ sẵn ô hoặc áo mưa vào túi, tan ca đỡ cuống nha." : voice.tip };
}
export function weatherBubbleMessage(report: WeatherReport, now = Date.now()) {
  const voice = weatherVoice(report, now);
  if (voice.tip.startsWith("Vài giờ tới")) return "Vài giờ tới có thể mưa, nhớ mang ô nha. Tan ca đỡ phải chạy vội.";
  const messages: Record<WeatherMood, string> = {
    storm: "Ngoài trời có dông, trú một chút nha. Chuyện đi làm để Tellme nghe.",
    rain: "Mưa rồi, bỏ ô vào túi nha. Một tô bún nóng cho giờ trưa?",
    snow: "Có tuyết rồi, mặc ấm nha. Một phần súp nóng cho bữa trưa nhé?",
    haze: "Ngoài trời hơi mờ, đi đường chậm thôi nha. Ăn trưa gần chỗ làm cũng ổn.",
    wind: "Gió khá mạnh, giữ chắc mũ nha. Ghé quán quen ăn trưa thôi.",
    hot: "Nóng ghê, nhớ mang nước nha. Trưa nay đổi gió với gỏi cuốn?",
    cool: "Trời se lạnh, nhớ chiếc áo mỏng. Một tô mì nóng nghe hợp đó.",
    cloud: "Trời dịu rồi, nghỉ tay một chút nha. Trưa nay ăn gì với đồng nghiệp?",
    clear: "Trời đẹp nè! Rủ đồng nghiệp ăn trưa, tiện kể tụi mình một chuyện?",
    night: "Tối rồi, tan ca về thong thả nha. Chưa ăn thì nhớ lót dạ nhé.",
  };
  return messages[voice.mood];
}
export function freshWeather(report: WeatherReport | undefined, now = Date.now()) {
  return report && !report.stale && now - report.fetchedAt < 60 * 60 * 1000 ? report : undefined;
}
export function displayWeather(report: WeatherReport | undefined, failed = false, now = Date.now()) {
  return report ? { ...report, stale: report.stale || failed || now - report.fetchedAt >= 30 * 60000 } : undefined;
}

/** Ignore fetch timestamps; repeated cached responses are not a weather change. */
export function weatherUpdateKey(report: WeatherReport) {
  return JSON.stringify([report.conditionId, report.icon, report.temperature, report.feelsLike, report.humidity, report.windKph, report.rainMm, report.forecastAvailable,
    report.forecast.slice(0, 4).map((p) => [p.at, p.temperature, p.conditionId, p.rainChance])]);
}
export function weatherUpdateMessage(report: WeatherReport, now = Date.now()) {
  const voice = weatherBubbleMessage(report, now);
  const next = report.forecast.find((p) => p.at > now);
  return `${report.temperature}°C, ${report.description}. ${voice}${next && !voice.includes("có thể mưa") ? ` Mốc dự báo tiếp theo khoảng ${next.temperature}°C.` : ""}`;
}
