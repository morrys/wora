const users = [
  {
    caption: 'Memorang',
    // You will need to prepend the image path with your baseUrl
    // if it is not '/', like: '/test-site/img/image.jpg'.
    image: '/wora/docs/assets/memorang-logo.png',
    infoLink: 'https://memorangapp.com',
    pinned: true,
  },
];


const siteConfig = {
  title: 'wora',
  tagline: 'Collection of libraries usable for the web, react and react-native.',
  url: 'https://morrys.github.io',
  baseUrl: '/wora/',
  projectName: 'wora',
  organizationName: 'morrys',
  headerLinks: [
    { doc: 'introduction', label: 'Docs' },
    {
      href: 'https://github.com/morrys/wora',
      label: 'GitHub',
    },
    { languages: false },
  ],
  // If you have users set above, you add it here:
  users,

  /* path to images for header/footer */
  headerIcon: 'img/favicon.ico',
  footerIcon: 'img/favicon.ico',
  favicon: 'img/favicon.ico',
  colors: {
    primaryColor: '#008ed8',
    secondaryColor: '#17afff',
  },

  /* Custom fonts for website */
  /*
  fonts: {
    myFont: [
      "Times New Roman",
      "Serif"
    ],
    myOtherFont: [
      "-apple-system",
      "system-ui"
    ]
  },
  */

  // This copyright info is used in /core/Footer.js and blog RSS/Atom feeds.
  copyright: `Copyright © ${new Date().getFullYear()} Lorenzo Di Giacomo`,

  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks.
    theme: 'default',
  },

  // Add custom scripts here that would be placed in <script> tags.
  scripts: ['https://buttons.github.io/buttons.js'],

  // On page navigation for the current documentation page.
  onPageNav: 'separate',
  // No .html extensions for paths.
  cleanUrl: true,

  // Open Graph and Twitter card images.
  ogImage: 'img/undraw_online.svg',
  twitterImage: 'img/undraw_tweetstorm.svg',
  twitterUsername: "m0rrys"

  // For sites with a sizable amount of content, set collapsible to true.
  // Expand/collapse the links and subcategories under categories.
  // docsSideNavCollapsible: true,

  // Show documentation's last contributor's name.
  // enableUpdateBy: true,

  // Show documentation's last update time.
  // enableUpdateTime: true,

  // You may provide arbitrary config keys to be used as needed by your
  // template. For example, if you need your repo's URL...
  //   repoUrl: 'https://github.com/facebook/test-site',
};

module.exports = siteConfig;