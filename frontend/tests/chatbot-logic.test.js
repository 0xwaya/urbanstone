import { getChatReply } from '../lib/chatbot';

describe('chatbot operating logic', () => {
    it('avoids duplicate residential-intake paragraphs', () => {
        const result = getChatReply('I am a homeowner planning a residential custom kitchen remodel in Mason.');
        const matches = result.reply.match(/For residential custom projects/gi) || [];
        expect(matches.length).toBeLessThanOrEqual(1);
    });

    it('adds liability guidance for natural-stone variability questions', () => {
        const result = getChatReply('For quartzite, can you guarantee exact veining and no seams?');

        expect(result.reply).toMatch(/Note:/);
        expect(result.reply).toMatch(/cannot be guaranteed from photos alone/i);
        expect(result.reply).toMatch(/next step:/i);
        expect(result.sources.length).toBeGreaterThan(0);
    });

    it('does not inject liability note for normal natural-stone scoping without explicit risk intent', () => {
        const result = getChatReply('I want granite countertops for my kitchen.');
        expect(result.reply).not.toMatch(/\n\nNote:/);
    });

    it('uses the timeline workflow when timeline intent is present', () => {
        const result = getChatReply('How fast can you install after deposit in Mason?');

        expect(result.reply).toMatch(/shortlist slab direction/i);
        expect(result.reply).toMatch(/schedule install|install on schedule/i);
        expect(result.reply).toMatch(/next step:/i);
        expect(result.sources.length).toBeGreaterThan(0);
    });

    it('routes contractor language through commercial intake details', () => {
        const result = getChatReply('We are a contractor with a 40-unit apartment project and need pricing.');

        expect(result.reply).toMatch(/contractor and multi-unit/i);
        expect(result.reply).toMatch(/next step: send unit count, weekly install pace, city, and start date/i);
    });

    it('returns removal waiver guidance for tear-out risk questions', () => {
        const result = getChatReply('Can you remove my vanity top and backsplash without damage so I can reuse it?');

        expect(result.reply).toMatch(/Note:/);
        expect(result.reply).toMatch(/cannot guarantee/i);
        expect(result.reply).toMatch(/reuse|reinstalled|intact/i);
    });

    it('returns material handling guidance for slab hold and vein matching questions', () => {
        const result = getChatReply('How long can you hold slabs and can you guarantee vein matching on a full height backsplash and large island?');

        expect(result.reply).toMatch(/vein matching/i);
        expect(result.reply).toMatch(/not guaranteed|additional material/i);
        expect(result.reply).not.toMatch(/Related:/i);
    });

    it('picks removal waiver note when removal trigger appears first', () => {
        const result = getChatReply('Can you remove and reinstall existing tops, and also what about quartzite variation?');
        expect(result.reply).toMatch(/Note:/);
        expect(result.reply).toMatch(/cannot guarantee removed tops|reused or reinstalled intact/i);
    });

    it('picks natural-stone waiver note when natural stone trigger appears first', () => {
        const result = getChatReply('For quartzite variation, if we later do a tear-out, what should we expect?');
        expect(result.reply).toMatch(/Note:/);
        expect(result.reply).toMatch(/Natural stone is unique/i);
    });

    it('picks vein-matching policy note when vein-matching trigger appears first', () => {
        const result = getChatReply('For vein matching on a full-height backsplash and large island, can you guarantee continuity?');
        expect(result.reply).toMatch(/additional material may be required|vein matching is not guaranteed/i);
    });

    it('does not append liability note for non-liability general questions', () => {
        const result = getChatReply('Do you service Mason and West Chester?');
        expect(result.reply).not.toMatch(/\n\nNote:/);
    });

    it('returns curated recommendations for kitchen asks without pricing spill', () => {
        const result = getChatReply('I need countertops for my kitchen, what do you recommend');

        expect(result.reply).toMatch(/curated shortlist/i);
        expect(result.reply).toMatch(/next step: share your first name, city, and rough sqft/i);
        expect(result.reply).not.toMatch(/\$\d|price|pricing/i);
    });

    it('offers a soft estimate link when enough scope detail is already present', () => {
        const result = getChatReply('60sf kitchen, granite like Absolute Black.');

        expect(result.reply).toMatch(/curated shortlist/i);
        expect(result.reply).toMatch(/start your estimate here: https:\/\/urbanstone\.co\/#quote/i);
        expect(result.reply).toMatch(/share your first name and city/i);
        expect(result.reply).not.toMatch(/\$\d|price|pricing/i);
    });

    it('keeps generic kitchen requests city-agnostic and asks material/look follow-up', () => {
        const result = getChatReply('hi i need new countertops for my kitchen');

        expect(result.reply).not.toMatch(/blue ash|mason|cincinnati|newport/i);
        expect(result.reply).toMatch(/what material or look do you have in mind/i);
        expect(result.reply).toMatch(/curated stone selection/i);
    });

    it('does not inject policy waivers for scope-only sink/island details', () => {
        const result = getChatReply('49 sf kitchen no island ceramic sink with 4 inch splash');

        expect(result.reply).not.toMatch(/slab holding|waiver|liability|cannot guarantee/i);
        expect(result.reply).not.toMatch(/\n\nNote:/);
    });

    it('asks for intake details when no indexed context matches', () => {
        const result = getChatReply('zxqv ptlm nrrk');

        expect(result.reply).toMatch(/can help with material selection, timing, and estimate prep/i);
        expect(result.reply).toMatch(/next step:/i);
        expect(result.sources).toEqual([]);
    });

    it('down-ranks long/location SEO snippets in early turns', () => {
        const result = getChatReply('Tell me about countertop options', { history: [] });
        expect(result.reply).not.toMatch(/Best for:/i);
        expect(result.reply).not.toMatch(/blue ash|mason|newport|west chester/i);
    });

    it('hides supplier contact details unless explicitly requested', () => {
        const generic = getChatReply('Tell me about countertop materials for kitchens');
        expect(generic.reply).not.toMatch(/Address:|Phone:/i);

        const explicit = getChatReply('What is Daltile address and phone?');
        expect(explicit.reply).toMatch(/Address:|Phone:/i);
    });
});
