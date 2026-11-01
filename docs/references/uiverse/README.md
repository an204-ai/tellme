# Uiverse components selected for Tellme

Exact public HTML/CSS and the site-generated React export, retrieved on 2026-10-28. Each JSON preserves its page URL, author and the MIT license notice displayed on that page. These are reference source files, not application code.

The React exports for CSS components use `styled-components`; they can be adapted to React components plus scoped CSS/Tailwind without adding that dependency. No account was created and no component was published.

| Role | Source | File |
| --- | --- | --- |
| loading | [Juanes200122/friendly-crab-3](https://uiverse.io/Juanes200122/friendly-crab-3) | [loading.json](loading.json) |
| reactions | [Mayurwaghgpr/foolish-liger-76](https://uiverse.io/Mayurwaghgpr/foolish-liger-76) | [reactions.json](reactions.json) |
| button | [KhaledMatalkah/tough-rat-6](https://uiverse.io/KhaledMatalkah/tough-rat-6) | [button.json](button.json) |
| toggle | [JaydipPrajapati1910/tricky-cobra-89](https://uiverse.io/JaydipPrajapati1910/tricky-cobra-89) | [toggle.json](toggle.json) |
| input | [uiverse-astronaut/purple-frog-72](https://uiverse.io/uiverse-astronaut/purple-frog-72) | [input.json](input.json) |
| tabs | [kaan_4205/funny-chicken-88](https://uiverse.io/kaan_4205/funny-chicken-88) | [tabs.json](tabs.json) |
| radio | [Pankaj-Meharchandani/curly-robin-81](https://uiverse.io/Pankaj-Meharchandani/curly-robin-81) | [radio.json](radio.json) |
| comment-reply | [zanina-yassine/quiet-turkey-90](https://uiverse.io/zanina-yassine/quiet-turkey-90) | [comment-reply.json](comment-reply.json) |
| form | [mahbowal/dull-ape-98](https://uiverse.io/mahbowal/dull-ape-98) | [form.json](form.json) |
| heart-tooltip | [ilkhoeri/polite-wasp-12](https://uiverse.io/ilkhoeri/polite-wasp-12) | [heart-tooltip.json](heart-tooltip.json) |
| tooltip | [Cobp/serious-termite-83](https://uiverse.io/Cobp/serious-termite-83) | [tooltip.json](tooltip.json) |
| daily-moment-stack | [codebykay101/ugly-lion-23](https://uiverse.io/codebykay101/ugly-lion-23) | [daily-moment-stack.json](daily-moment-stack.json) |
| not-found | [preet_7613/new-cougar-63](https://uiverse.io/preet_7613/new-cougar-63) | [not-found.json](not-found.json) |

## Integration notes

- **loading:** Four overlapping SVG rings; ringA/B/C/D stroke-dasharray animation, 2s infinite. Recolor strokes with Tellme primary #07327F; retain geometry/keyframes. Original credited Nawsome as well as Juanes200122.
- **reactions:** Tailwind rounded horizontal emoji tray; emoji buttons rise and scale on hover with small labels. Original choices: 👍, 👏🏻, 🎉, ✨, 🙂. Add accessible labels and controlled state.
- **button:** Pill button with opposing sliding gradient pseudo-elements, hover lift and active press. Preserve interaction and pill geometry; adapt gradients to Tellme palette.
- **toggle:** Compact 46×24 pill switch; 18px white thumb, cross/checkmark, elastic cubic-bezier motion. Recolor checked track primary; use a keyboard-focusable switch rather than display:none input.
- **input:** 48px pill input with leading search icon, keyboard shortcut badge and focus ring. The original CSS contains a broken s:// Google Fonts import and Inter; remove the import and use Tellme Poppins.
- **tabs:** Rounded segmented tabs with animated glider; original fixed 70×30 tabs and three radio controls. Adapt width and ARIA semantics without copying fixed duplicate IDs.
- **radio:** Vertical set of wide pill radio tiles with leading selection dot, icon and text. Blue checked outline/fill, subtle shadow. Original HTML contains large SVG icons; local icon replacements can preserve style.
- **comment-reply:** White rounded comment card; thin title rule, left reaction stack, author/content region and input/send footer. Adapt full-width to post thread, preserve reply field and heart affordance.
- **form:** Rounded white-to-light-slate form surface with white border, soft lower shadow, padded rounded inputs and blue CTA. Adapt to primary and Poppins; source content and external social links are examples.
- **heart-tooltip:** Animated outlined heart button with fill/scale interaction, circular check stroke and floating pill tooltip. Use the brand navy for the heart; place it in the main Like action with visible overflow.
- **tooltip:** Tailwind data-tooltip pseudo-element label and pointer; opacity/scale entrance under icon button. Adapt z-index (source uses 9999999999) and provide keyboard/focus visibility.
- **not-found:** Animated SVG face: blinking/moving pupils, eyes, mouth/nose motions on a transparent background. Source is the illustration; add actual 404 text and home navigation in application.

Keep the relevant copyright and MIT permission notices when copying or adapting substantial portions. [LICENSES.md](LICENSES.md) collects the exact notices; each JSON also contains its own notice.

- **daily-moment-stack:** Rotated, overlapping cards spread on hover/focus. Real daily photos replace the source SVG illustrations; each card opens its own photo index.
- **reactions placement:** The emoji tray belongs to each daily-moment photo; posts use the animated heart in their main Like action.
