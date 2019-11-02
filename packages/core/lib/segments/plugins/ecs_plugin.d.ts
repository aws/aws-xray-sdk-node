export interface ECSMetadata {
  ecs: {
    container: string;
  };
}

export function getData(callback: (metadata?: ECSMetadata) => void): void;

export const originName: string;
