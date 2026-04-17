import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Standard mobile device viewport guide (e.g. iPhone 13)
const guidelineBaseWidth = 390;
const guidelineBaseHeight = 844;

/**
 * Scale horizontal dimensions (e.g., width, paddingHorizontal, marginLeft)
 * based on device width relative to guideline width.
 */
export const scale = (size) => (width / guidelineBaseWidth) * size;

/**
 * Scale vertical dimensions (e.g., height, paddingVertical, marginTop)
 * based on device height relative to guideline height.
 */
export const verticalScale = (size) => (height / guidelineBaseHeight) * size;

/**
 * Moderate scale factor for nuanced responsiveness. 
 * Prevents extreme scaling on large tablets or very small devices.
 * Use this for fonts, radiuses, and elements that shouldn't blow up too heavily.
 */
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Fluid typography sizing.
 */
export const rf = (size) => moderateScale(size, 0.4);

/**
 * Width and Height Percentages.
 */
export const wp = (percentage) => (width * percentage) / 100;
export const hp = (percentage) => (height * percentage) / 100;
