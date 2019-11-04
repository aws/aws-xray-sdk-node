export interface ElasticBeanstalkMetadata {
  elastic_beanstalk: {
    environment: string;
    version_label: string;
    deployment_id: number;
  };
}

export function getData(callback: (metadata?: ElasticBeanstalkMetadata) => void): void;

export const originName: string;
