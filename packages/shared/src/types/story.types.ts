export interface StoryItem {
  id: string;
  dailyStoryId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  blurhash?: string;
  note?: string | null;
  takenAt: string;
}

export interface DailyStory {
  id: string;
  userId: string;
  storyDate: string;
  caption?: string | null;
  items: StoryItem[];
}
