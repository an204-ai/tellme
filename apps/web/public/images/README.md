# Tellme social assets

User-supplied PNG artwork, preserved with ASCII English filenames.

- `group-avatars/`: friends, noodles, seaside, family, reading, gamers.
- `reactions/`: like, love, haha, wow, sad. Used for posts and moments.
- `anonymous-avatars/`: 15 distinct species — bear, owl, otter, fox, cat, rabbit, frog, penguin, fish, nightingale, sparrow, bird, turtle, squirrel, dog. All current anonymous aliases have matching artwork; original transparent PNGs preserved. See its README for filenames and alias mappings.

Registry: `src/lib/social-assets.ts`. Backend accepts exact preset paths or images uploaded by the group creator.

Anonymous artwork registry: `src/lib/anonymous-avatars.ts`. Avatars use a white circular frame with a subtle navy-gray border. Never borrow another species' image.
