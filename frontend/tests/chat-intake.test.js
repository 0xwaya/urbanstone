import {
    buildSeasonalWeatherNote,
    detectGreetingIntent,
    extractEstimateIntake,
    getLiveEstimateRange,
    getMissingEstimateFields,
    shouldStartEstimateIntake,
    shouldSubmitIntake,
} from '../lib/chat-intake';

describe('chat estimate intake', () => {
    it('detects intake intent from pricing language', () => {
        expect(shouldStartEstimateIntake('Can you give me a quote for my kitchen?', [])).toBe(true);
    });

    it('does not force intake for unrelated messages when no active intake session exists', () => {
        const history = [
            { role: 'user', content: 'Need a quote for a kitchen remodel' },
            { role: 'assistant', content: 'We can help with that.' },
        ];

        expect(shouldStartEstimateIntake('What colors do you recommend?', history)).toBe(false);
    });

    it('continues intake when an active intake session exists', () => {
        const history = [
            { role: 'assistant', content: 'I can run estimate intake here and hand it to Urban Stone.' },
            { role: 'user', content: 'Mason kitchen project around 54 sq ft' },
        ];

        expect(shouldStartEstimateIntake('confirm', history)).toBe(true);
    });

    it('extracts major estimate fields from conversational text', () => {
        const intake = extractEstimateIntake(
            'My name is Jamie Stone. My email is jamie@example.com and phone is (513) 555-0101. Kitchen project in Mason. About 54 sq ft. I want Calacatta Laza and timeline is next week.',
            []
        );

        expect(intake.name).toBe('Jamie Stone');
        expect(intake.email).toBe('jamie@example.com');
        expect(intake.phone).toBe('(513) 555-0101');
        expect(intake.city).toBe('Mason');
        expect(intake.customerSegment).toBe('residential-custom');
        expect(intake.projectType).toBe('kitchen');
        expect(intake.projectPhase).toBe('');
        expect(intake.projectStatus).toBe('');
        expect(intake.tentativeBudget).toBe('');
        expect(intake.material).toBe('Calacatta Laza');
        expect(intake.squareFootage).toBe(54);
        expect(intake.timeline).toBe('1-2 weeks');
    });

    it('reports missing intake fields in deterministic order', () => {
        const intake = {
            name: 'Jamie Stone',
            email: '',
            phone: '',
            customerSegment: '',
            city: 'Mason',
            projectType: 'kitchen',
            projectPhase: '',
            projectStatus: '',
            tentativeBudget: '',
            material: '',
            squareFootage: null,
            timeline: '',
        };

        expect(getMissingEstimateFields(intake)).toEqual([
            'email',
            'phone',
            'customerSegment',
            'projectPhase',
            'projectStatus',
            'tentativeBudget',
            'material',
            'squareFootage',
            'timeline',
        ]);
    });

    it('detects explicit submit phrase', () => {
        expect(shouldSubmitIntake('Send it')).toBe(true);
        expect(shouldSubmitIntake('Looks good, proceed')).toBe(false);
        expect(shouldSubmitIntake('that works')).toBe(false);
        expect(shouldSubmitIntake('Not yet')).toBe(false);
    });

    it('builds provisional live estimate range from sqft and material group', () => {
        const range = getLiveEstimateRange({
            squareFootage: 54,
            materialGroup: 'Quartz',
        });

        expect(range).toEqual({
            low: 2970,
            high: 4050,
            unitRateLow: 55,
            unitRateHigh: 75,
        });
    });

    it('detects segment, phase, status, and budget for flipper/builder language', () => {
        const intake = extractEstimateIntake(
            'I am a flipper working a vacant rental turnover in West Chester. Budget is $3500 to $6000. We are in demo and need pricing.',
            []
        );

        expect(intake.name).toBe('');
        expect(intake.customerSegment).toBe('contractor-flipper');
        expect(intake.projectPhase).toBe('demo');
        expect(intake.projectStatus).toBe('vacant');
        expect(intake.tentativeBudget).toBe('$3,500-$6,000');
    });

    it('detects greeting intent and seasonal weather note', () => {
        expect(detectGreetingIntent('Hi there')).toBe(true);
        expect(detectGreetingIntent('hello')).toBe(true);
        expect(detectGreetingIntent('Need quote in Mason')).toBe(false);
        expect(buildSeasonalWeatherNote(new Date('2026-04-18T12:00:00Z'))).toMatch(/Spring weather/i);
    });

    it('captures plain full-name replies when assistant explicitly asks for name', () => {
        const intake = extractEstimateIntake('john doe', [
            { role: 'assistant', content: 'I can run estimate intake here and hand it to Urban Stone.' },
            { role: 'assistant', content: 'What is your full name?' },
        ]);

        expect(intake.name).toBe('John Doe');
    });

    it('does not treat non-name probe text as a valid name reply', () => {
        const intake = extractEstimateIntake('echo line', [
            { role: 'assistant', content: 'What is your full name?' },
        ]);

        expect(intake.name).toBe('');
    });
});
