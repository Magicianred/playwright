/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { it, expect } from './fixtures';
import * as path from 'path';

const { selectorsV2Enabled } = require(path.join(__dirname, '..', 'lib', 'server', 'common', 'selectorParser'));

it('should work for open shadow roots', async ({page, server}) => {
  await page.goto(server.PREFIX + '/deep-shadow.html');
  expect(await page.$eval(`id=target`, e => e.textContent)).toBe('Hello from root2');
  expect(await page.$eval(`data-testid=foo`, e => e.textContent)).toBe('Hello from root1');
  expect(await page.$$eval(`data-testid=foo`, els => els.length)).toBe(3);
  expect(await page.$(`id:light=target`)).toBe(null);
  expect(await page.$(`data-testid:light=foo`)).toBe(null);
  expect(await page.$$(`data-testid:light=foo`)).toEqual([]);
});

it('should work with :index', async ({page}) => {
  if (!selectorsV2Enabled())
    return; // Selectors v1 do not support this.
  await page.setContent(`
    <section>
      <div id=target1></div>
      <div id=target2></div>
      <span id=target3></span>
      <div id=target4></div>
    </section>
  `);
  expect(await page.$$eval(`:index(1, div, span)`, els => els.map(e => e.id).join(';'))).toBe('target1');
  expect(await page.$$eval(`:index(2, div, span)`, els => els.map(e => e.id).join(';'))).toBe('target2');
  expect(await page.$$eval(`:index(3, div, span)`, els => els.map(e => e.id).join(';'))).toBe('target3');

  const error = await page.waitForSelector(`:index(5, div, span)`, { timeout: 100 }).catch(e => e);
  expect(error.message).toContain('100ms');

  const promise = page.waitForSelector(`:index(5, div, span)`, { state: 'attached' });
  await page.$eval('section', section => section.appendChild(document.createElement('span')));
  const element = await promise;
  expect(await element.evaluate(e => e.tagName)).toBe('SPAN');
});

it('should work with :visible', async ({page}) => {
  if (!selectorsV2Enabled())
    return; // Selectors v1 do not support this.
  await page.setContent(`
    <section>
      <div id=target1></div>
      <div id=target2></div>
    </section>
  `);
  expect(await page.$('div:visible')).toBe(null);

  const error = await page.waitForSelector(`div:visible`, { timeout: 100 }).catch(e => e);
  expect(error.message).toContain('100ms');

  const promise = page.waitForSelector(`div:visible`, { state: 'attached' });
  await page.$eval('#target2', div => div.textContent = 'Now visible');
  const element = await promise;
  expect(await element.evaluate(e => e.id)).toBe('target2');

  expect(await page.$eval('div:visible', div => div.id)).toBe('target2');
});
