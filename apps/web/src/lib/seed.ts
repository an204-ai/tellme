import type { AppData } from "./types";
import { localDay } from "./validation";

export const photo = (id: string, width = 1200) =>
  `/images/${id}${width === 120 ? "-avatar" : ""}.jpg`;
export const pictures = {
  mountains: photo("photo-1476514525535-07fb3b4ae5f1"),
  coffee: photo("photo-1495474472287-4d71bcdd2085"),
  forest: photo("photo-1441974231531-c6227db76b6e"),
  sea: photo("photo-1518837695005-2083093ee35b"),
  sunset: photo("photo-1500530855697-b586d89ba3ee"),
  morning: photo("photo-1501785888041-af3ef285b470"),
};
export function makeSeed(): AppData {
  const ago = (minutes: number) =>
    new Date(Date.now() - minutes * 60000).toISOString();
  const day = localDay();
  return {
    version: 1,
    people: [
      {
        id: "me",
        username: "minhan",
        name: "Minh An",
        avatar: photo("photo-1534528741775-53994a69daeb", 120),
        bio: "Gom nhặt những điều nhỏ xinh. Đi, chụp và kể lại.",
        location: "TP. Hồ Chí Minh",
        cover: pictures.mountains,
      },
      {
        id: "linh",
        username: "linhnguyen",
        name: "Linh Nguyễn",
        avatar: photo("photo-1494790108377-be9c29b29330", 120),
        bio: "Một chút cà phê, một chút thiên nhiên và thật nhiều câu chuyện.",
        location: "Đà Lạt",
        cover: pictures.forest,
      },
      {
        id: "huy",
        username: "quanghuy",
        name: "Quang Huy",
        avatar: photo("photo-1506794778202-cad84cf45f1d", 120),
        bio: "Chụp những gì mình thấy. Kể những gì mình yêu.",
        location: "Đà Nẵng",
        cover: pictures.sea,
      },
      {
        id: "mai",
        username: "maianh",
        name: "Mai Anh",
        avatar: photo("photo-1517841905240-472988babdf9", 120),
        bio: "Học cách chậm lại và tận hưởng từng ngày.",
        location: "Hà Nội",
        cover: pictures.coffee,
      },
      {
        id: "duc",
        username: "ducpham",
        name: "Đức Phạm",
        avatar: photo("photo-1500648767791-00dcc994a43e", 120),
        bio: "Cuối tuần luôn có một chuyến đi.",
        location: "TP. Hồ Chí Minh",
        cover: pictures.morning,
      },
    ],
    posts: [
      {
        id: "p1",
        authorId: "linh",
        content:
          "Có những ngày, chỉ cần đi thật xa một chút để thấy lòng mình gần lại. 🌿\n\nSáng nay thức dậy ở một nơi không có tiếng còi xe. Chỉ có mặt hồ, những ngọn núi và một khoảng trời thật rộng. Mong là hôm nay của bạn cũng có một điều dịu dàng như thế.",
        image: pictures.mountains,
        topic: "Những chuyến đi",
        privacy: "public",
        anonymous: false,
        createdAt: ago(28),
        likes: 128,
        reaction: null,
        comments: [
          {
            id: "c1",
            userId: "huy",
            content:
              "Nhìn thôi đã muốn xách ba lô lên rồi. Bình yên quá Linh ơi!",
            createdAt: ago(20),
          },
          {
            id: "c2",
            userId: "mai",
            content: "Một chút dịu dàng cho ngày mới 💙",
            createdAt: ago(15),
          },
        ],
        saved: false,
        shares: 12,
      },
      {
        id: "p2",
        authorId: "huy",
        content:
          "Góc quen, ly cà phê quen. Chỉ có cuốn sách là mới.\n\nCuối cùng cũng dành được một buổi sáng cho chính mình. Còn bạn, điều nhỏ bé nào khiến hôm nay dễ chịu hơn?",
        image: pictures.coffee,
        topic: "Điều nhỏ bé",
        privacy: "public",
        anonymous: false,
        createdAt: ago(76),
        likes: 86,
        reaction: null,
        comments: [
          {
            id: "c3",
            userId: "linh",
            content: "Một ly cà phê ngon đúng là chữa lành được nhiều thứ ☕",
            createdAt: ago(50),
          },
        ],
        saved: false,
        shares: 4,
      },
      {
        id: "p3",
        authorId: "mai",
        content:
          "Hôm nay mình đã nói lời cảm ơn với một người mà trước giờ cứ nghĩ là không cần phải nói.\n\nHóa ra, những điều nhỏ nhất lại là những điều khiến mình nhớ lâu nhất. Đừng để dành sự tử tế nhé.",
        image: "",
        topic: "Chuyện mỗi ngày",
        privacy: "public",
        anonymous: false,
        createdAt: ago(140),
        likes: 214,
        reaction: null,
        comments: [],
        saved: false,
        shares: 8,
      },
      {
        id: "p4",
        authorId: "me",
        content:
          "Một lời nhắc cho bản thân: không cần ngày nào cũng phải thật đặc biệt. Được sống chậm, ăn ngon và nghe một bài nhạc yêu thích cũng đã là một ngày đáng nhớ rồi.",
        image: pictures.sunset,
        topic: "Điều nhỏ bé",
        privacy: "public",
        anonymous: false,
        createdAt: ago(1100),
        likes: 42,
        reaction: null,
        comments: [],
        saved: false,
        shares: 2,
      },
      {
        id: "p5",
        authorId: "duc",
        content:
          "Biển hôm nay đẹp đến mức mình quên cả chụp ảnh. May mà vẫn kịp giữ lại một khoảnh khắc này. Hẹn một ngày cùng nhau đi thật xa!",
        image: pictures.sea,
        topic: "Những chuyến đi",
        privacy: "public",
        anonymous: false,
        createdAt: ago(230),
        likes: 67,
        reaction: null,
        comments: [],
        saved: false,
        shares: 3,
      },
    ],
    stories: [
      {
        id: "s1",
        userId: "linh",
        day,
        privacy: "public",
        items: [
          {
            id: "m1",
            image: pictures.forest,
            caption: "Chào buổi sáng từ một nơi thật xanh.",
            at: ago(160),
          },
          {
            id: "m2",
            image: pictures.mountains,
            caption: "Một khoảng lặng giữa ngày.",
            at: ago(40),
          },
        ],
      },
      {
        id: "s2",
        userId: "huy",
        day,
        privacy: "public",
        items: [
          {
            id: "m3",
            image: pictures.coffee,
            caption: "Bắt đầu ngày bằng mùi cà phê.",
            at: ago(220),
          },
        ],
      },
      {
        id: "s3",
        userId: "mai",
        day,
        privacy: "public",
        items: [
          {
            id: "m4",
            image: pictures.sunset,
            caption: "Hôm nay, mình chọn chậm lại.",
            at: ago(100),
          },
        ],
      },
      {
        id: "s4",
        userId: "duc",
        day,
        privacy: "public",
        items: [
          {
            id: "m5",
            image: pictures.sea,
            caption: "Hít một hơi đầy mùi biển.",
            at: ago(90),
          },
        ],
      },
    ],
    conversations: [
      {
        id: "chat-linh",
        userId: "linh",
        unread: 2,
        messages: [
          {
            id: "msg1",
            text: "An ơi, cuối tuần này có kế hoạch gì chưa?",
            own: false,
            at: ago(40),
          },
          {
            id: "msg2",
            text: "Mình đang định tìm một quán cà phê yên tĩnh. Bạn đi cùng không?",
            own: true,
            at: ago(35),
          },
          {
            id: "msg3",
            text: "Đi chứ! Mình biết một chỗ có góc cửa sổ đẹp lắm ☕",
            own: false,
            at: ago(10),
          },
        ],
      },
      {
        id: "chat-huy",
        userId: "huy",
        unread: 0,
        messages: [
          {
            id: "msg4",
            text: "Ảnh chuyến đi vừa rồi đẹp thật đó!",
            own: true,
            at: ago(150),
          },
          {
            id: "msg5",
            text: "Cảm ơn An nhé. Lần sau đi cùng tụi mình nha!",
            own: false,
            at: ago(120),
          },
        ],
      },
      {
        id: "chat-mai",
        userId: "mai",
        unread: 0,
        messages: [
          {
            id: "msg6",
            text: "Gửi bạn một chút năng lượng tích cực cho hôm nay 💙",
            own: false,
            at: ago(900),
          },
        ],
      },
    ],
    notifications: [
      {
        id: "n1",
        userId: "linh",
        text: "đã thả tim câu chuyện của bạn.",
        read: false,
        at: ago(12),
        postId: "p4",
      },
      {
        id: "n2",
        userId: "huy",
        text: "đã bắt đầu theo dõi bạn.",
        read: false,
        at: ago(60),
      },
      {
        id: "n3",
        userId: "mai",
        text: "đã chia sẻ một Chuyện hôm nay mới.",
        read: true,
        at: ago(100),
      },
      {
        id: "n4",
        userId: "duc",
        text: "đã gửi lời mời kết nối với bạn.",
        read: true,
        at: ago(400),
      },
    ],
    following: ["linh", "huy"],
    connections: ["linh", "mai"],
    blocked: [],
    hiddenPosts: [],
    reports: [],
    settings: {
      audience: "public",
      notifyLikes: true,
      notifyMessages: true,
      emailUpdates: false,
      reducedMotion: false,
    },
  };
}
