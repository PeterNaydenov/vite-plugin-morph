// Consumer Application
// NOTE: This assumes @example/ui-components is installed
// To install: cd ../library-demo && npm run build:lib && cd dist/library && npm pack
// Then: npm install ../library-demo/dist/library/example-ui-components-1.0.0.tgz

import { Button, Card, applyStyles, themesControl } from '@example/ui-components';

// 1. Apply all CSS layers
applyStyles();

// 2. Render components
const app = document.getElementById('app');

app.innerHTML = `
  <div style="padding: 2rem; max-width: 800px; margin: 0 auto;">
    <h1>Library Consumer Demo</h1>
    <p>Using components from @example/ui-components</p>
    
    <div style="margin: 2rem 0;">
      <h2>Buttons</h2>
      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        ${Button('render', { text: 'Primary', variant: 'primary' })}
        ${Button('render', { text: 'Secondary', variant: 'secondary' })}
        ${Button('render', { text: 'Outline', variant: 'outline' })}
      </div>
    </div>
    
    <div style="margin: 2rem 0;">
      <h2>Cards</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
        ${Card({
    title: 'Default Card',
    content: 'This is a default card with no special styling.',
    variant: 'default'
})}
        ${Card({
    title: 'Elevated Card',
    content: 'This card has a shadow effect.',
    variant: 'elevated'
})}
        ${Card({
    title: 'Outlined Card',
    content: 'This card has a border.',
    variant: 'outlined'
})}
      </div>
    </div>
    
    <div style="margin: 2rem 0;">
      <h2>Theme Switcher</h2>
      <p>Available themes: ${themesControl.list().join(', ')}</p>
      <p>Current theme: <strong id="current-theme">${themesControl.getCurrent()}</strong></p>
      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        ${Button('render', { text: 'Default Theme', variant: 'primary' })}
        ${Button('render', { text: 'Dark Theme', variant: 'secondary' })}
      </div>
    </div>
  </div>
`;

// 3. Add theme switching functionality
const buttons = app.querySelectorAll('button');
buttons[3].addEventListener('click', () => {
    themesControl.set('default');
    document.getElementById('current-theme').textContent = themesControl.getCurrent();
});

buttons[4].addEventListener('click', () => {
    themesControl.set('dark');
    document.getElementById('current-theme').textContent = themesControl.getCurrent();
});
