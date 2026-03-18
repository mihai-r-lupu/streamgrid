import { strict as assert } from 'assert';
import { escapeHtml, html } from '../../src/utils/html.js';

describe('escapeHtml()', () => {
    it('escapes < and >', () => {
        assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
    });

    it('escapes &', () => {
        assert.equal(escapeHtml('a & b'), 'a &amp; b');
    });

    it('escapes double quotes', () => {
        assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
    });

    it("escapes single quotes", () => {
        assert.equal(escapeHtml("O'Brien"), 'O&#39;Brien');
    });

    it('returns empty string for null', () => {
        assert.equal(escapeHtml(null), '');
    });

    it('returns empty string for undefined', () => {
        assert.equal(escapeHtml(undefined), '');
    });

    it('coerces numbers to string', () => {
        assert.equal(escapeHtml(42), '42');
    });

    it('leaves safe strings unchanged', () => {
        assert.equal(escapeHtml('hello world'), 'hello world');
    });
});

describe('html tag function', () => {
    it('passes through a static string with no interpolations', () => {
        assert.equal(html`<strong>hello</strong>`, '<strong>hello</strong>');
    });

    it('escapes interpolated values', () => {
        const name = '<World>';
        assert.equal(html`<p>${name}</p>`, '<p>&lt;World&gt;</p>');
    });

    it('escapes interpolated values in attribute position', () => {
        const cls = '"my-class"';
        assert.equal(html`<div class=${cls}>`, '<div class=&quot;my-class&quot;>');
    });

    it('handles null interpolation as empty string', () => {
        assert.equal(html`<span>${null}</span>`, '<span></span>');
    });

    it('handles undefined interpolation as empty string', () => {
        assert.equal(html`<span>${undefined}</span>`, '<span></span>');
    });

    it('coerces numeric interpolations', () => {
        const n = 99;
        assert.equal(html`<b>${n}</b>`, '<b>99</b>');
    });
});
