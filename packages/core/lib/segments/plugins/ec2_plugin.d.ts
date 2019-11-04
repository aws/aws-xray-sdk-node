export interface EC2Metadata {
  ec2: {
    instance_id: string;
    availability_zone: string;
  };
}

export function getData(callback: (metadata?: EC2Metadata) => void): void;

export const originName: string;
