import React from 'react';
import MapView, { PROVIDER_GOOGLE, MapViewProps } from 'react-native-maps';

/**
 * Wrapper fino de MapView. El montaje diferido y la región controlada
 * se gestionan en LiveMap para evitar Markers vacíos en Android.
 */
export const SafeMap: React.FC<MapViewProps> = (props) => {
  return <MapView {...props} provider={PROVIDER_GOOGLE} />;
};
