const getColorblindClass = (isColorblindModeActive : boolean, stateClass? : string) : string => {
  if(!isColorblindModeActive) return '';
  return `letter-colorblind-${stateClass}`;
}

export default getColorblindClass;