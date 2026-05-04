import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:5174/login');
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'tamas.is.immortal@gmail.com');
  await page.type('input[type="password"]', 'qwerty123');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to feed...');
  await page.waitForNavigation();
  
  console.log('Navigating to messages list...');
  await page.goto('http://localhost:5174/messages');
  await page.waitForSelector('a[href^="/messages/"]');
  
  const chatLinks = await page.$$('a[href^="/messages/"]');
  if (chatLinks.length > 0) {
    console.log('Clicking a chat...');
    await chatLinks[0].click();
    await page.waitForTimeout(2000); // Wait for potential crash
  } else {
    console.log('No chats found.');
  }

  await browser.close();
  console.log('Done.');
})();
