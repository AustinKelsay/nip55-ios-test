/// <reference types="expo-router/types" />

declare module '*.png' {
  const uri: string;
  export default uri;
}
declare module '*.jpg' {
  const uri: string;
  export default uri;
}
declare module '*.jpeg' {
  const uri: string;
  export default uri;
}
declare module '*.svg' {
  import * as React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
