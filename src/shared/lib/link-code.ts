// a code carried by a link (?promo=, ?ref=, ?code=, a start_param's tail)
const CODE = "[A-Za-z0-9_-]{1,64}";

export const LINK_CODE = new RegExp(`^${CODE}$`);

/** The bot's deep link as the Mini App's start_param: <kind>_<code>, the kind in group 1, the code in group 2. */
export const startParamPattern = (kinds: readonly string[]): RegExp => new RegExp(`^(${kinds.join("|")})_(${CODE})$`);
