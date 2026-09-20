import { getSmsHref, getSmsNumber } from '../lib/contact';

describe('contact links', () => {
    it('targets the Urban Stone business SMS line with an encoded prompt', () => {
        expect(getSmsNumber()).toBe('+15133075840');
        expect(getSmsHref('Hola Urban Stone')).toBe('sms:+15133075840?body=Hola%20Urban%20Stone');
    });
});