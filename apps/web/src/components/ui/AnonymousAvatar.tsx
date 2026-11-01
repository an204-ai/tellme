import Image from "next/image";
import { Bird, Cat, Dog, Fish, Rabbit, Squirrel, Turtle, UserRound } from "lucide-react";
import type { AnonymousIdentity, Post } from "@/lib/types";
import { anonymousAvatars } from "@/lib/anonymous-avatars";

const animals: Partial<Record<AnonymousIdentity["animal"], typeof Cat>> = { bird: Bird, nightingale: Bird, sparrow: Bird, owl: Bird, cat: Cat, dog: Dog, fish: Fish, rabbit: Rabbit, squirrel: Squirrel, turtle: Turtle };
const fallback: AnonymousIdentity = { name: "Mèo muốn ngủ", animal: "cat", color: "lavender" };
export const postPersona = (post: Pick<Post, "anonymousIdentity">) => post.anonymousIdentity || fallback;

export function AnonymousAvatar({ identity, small = false }: { identity: AnonymousIdentity; small?: boolean }) {
  const image = anonymousAvatars[identity.animal];
  const Animal = animals[identity.animal] || UserRound;
  return <span className={`anonymous-persona${small ? " is-small" : ""}`} data-color={identity.color} data-artwork={!!image} aria-label={`Ảnh đại diện của ${identity.name}`} role="img">{image ? <Image src={image} width={96} height={96} sizes={small ? "34px" : "43px"} alt="" aria-hidden="true" draggable={false} /> : <Animal size={small ? 20 : 25} strokeWidth={1.7} aria-hidden="true" />}</span>;
}
