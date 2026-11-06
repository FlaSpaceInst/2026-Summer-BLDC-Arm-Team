/** Browser breakpoints and fixed dimensions for the original RE-RASSOR UI. */
export function getWebLayout(width, height, platform) {
  const layout = {
    isWeb: false,
    isCompact: false,
    isPhone: false,
    isStacked: false,
    isShort: false,
    viewportMinHeight: undefined,
    outerPadding: 24,
    titleHeight: 74,
    titleFontSize: 46,
    logoWidth: 132,
    cardPadding: 28,
    messageFontSize: 28,
    ipFontSize: 24,
    roverButtonWidth: '60%',
    buttonDirection: 'row',
    primaryButtonWidth: '45%',
    secondaryButtonWidth: '53%',
    helpTitleSize: 44,
    helpPadding: 24,
    helpTextPaddingHorizontal: 30,
    helpTextPaddingVertical: 32,
    helpTextSize: 25,
    helpLineHeight: 38,
    helpLogoWidth: 138,
    cameraScreenHeight: height,
    cameraPanelHeight: 600,
    cameraFeedHeight: 350,
    cameraHeaderHeight: 78
  };

  if (platform !== 'web') {
    return layout;
  }

  layout.isWeb = true;
  layout.viewportMinHeight = height;
  layout.isCompact = width < 760;
  layout.isPhone = width < 520;
  layout.isStacked = width < 1050;
  layout.isShort = height < 650;

  if (layout.isCompact) {
    layout.titleFontSize = 28;
    layout.logoWidth = 104;
    layout.cardPadding = 12;
    layout.messageFontSize = 21;
    layout.ipFontSize = 19;
    layout.roverButtonWidth = '100%';
    layout.helpTitleSize = 27;
    layout.helpPadding = 12;
    layout.helpTextPaddingHorizontal = 18;
    layout.helpTextPaddingVertical = 22;
    layout.helpTextSize = 19;
    layout.helpLineHeight = 29;
    layout.helpLogoWidth = 94;
    layout.cameraScreenHeight = 780;
    layout.cameraPanelHeight = 770;
    layout.cameraFeedHeight = 480;
    layout.cameraHeaderHeight = 100;
  }

  if (layout.isPhone) {
    layout.buttonDirection = 'column';
    layout.primaryButtonWidth = '100%';
    layout.secondaryButtonWidth = '100%';
  }

  if (layout.isShort) {
    layout.outerPadding = 12;
    layout.titleHeight = 56;
  }

  return layout;
}
