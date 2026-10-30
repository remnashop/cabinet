/**
 * A bank card's 1.586 from sm up, where it stands 340px wide beside the action tiles; a full-width phone card that
 * tall left its number floating in empty space, so there it is 2:1 but no lower than 220px (aspect-ratio still grows
 * to fit the content). The slider's "buy" placeholder and the home skeleton share it.
 */
export const CARD_ASPECT = "aspect-[2] min-h-[220px] sm:aspect-[1.586] sm:min-h-0";

/**
 * The slider (cards and the "buy" slide to swipe): full width below lg, so 1.7:1 there, growing with the width, but
 * no lower than 216px; a bank card's 1.586 three across on desktop.
 */
export const CARD_ASPECT_SHORT = "aspect-[1.7] min-h-[216px] lg:aspect-[1.586] lg:min-h-0";

