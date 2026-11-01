import type { AnonymousIdentity } from "./types";

/** All fifteen species have their own artwork; never borrow another animal's image. */
export const anonymousAvatars: Record<AnonymousIdentity["animal"], string> = {
  bear: "/images/anonymous-avatars/bear.png",
  owl: "/images/anonymous-avatars/owl.png",
  otter: "/images/anonymous-avatars/otter.png",
  fox: "/images/anonymous-avatars/fox.png",
  cat: "/images/anonymous-avatars/cat.png",
  rabbit: "/images/anonymous-avatars/rabbit.png",
  frog: "/images/anonymous-avatars/frog.png",
  penguin: "/images/anonymous-avatars/penguin.png",
  fish: "/images/anonymous-avatars/fish.png",
  nightingale: "/images/anonymous-avatars/nightingale.png",
  sparrow: "/images/anonymous-avatars/sparrow.png",
  bird: "/images/anonymous-avatars/bird.png",
  turtle: "/images/anonymous-avatars/turtle.png",
  squirrel: "/images/anonymous-avatars/squirrel.png",
  dog: "/images/anonymous-avatars/dog.png",
};
