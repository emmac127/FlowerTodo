import { createElement } from 'react';
import 'css-doodle';

interface CssDoodleProps {
  className?: string;
  children: string;
}

export function CssDoodle({ className, children }: CssDoodleProps) {
  return createElement('css-doodle', { className }, children);
}
