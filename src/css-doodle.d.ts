import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type CssDoodleProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'css-doodle': CssDoodleProps;
    }
  }
}

export {};
