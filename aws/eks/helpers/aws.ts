import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { cluster } from "../eks";
import { awsProvider } from "../providers";
import { eksClusterName, tags } from "../variables";

export type CustomPolicy = {
  actions: string[];
  resources: string[];
};

export function createIRSARole(
  service: string,
  namespace: string,
  awsPolicies: string[] = [],
  customPolicies: CustomPolicy[] = []
): pulumi.Output<string> {
  const irsaRoleName = `${service}-sa`;

  const assumeRolePolicy = cluster.core.oidcProvider?.apply(provider => {
    if (!provider) {
      throw new Error("OIDC provider is undefined. Make sure the cluster is configured correctly.");
    }

    return JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRoleWithWebIdentity",
          Effect: "Allow",
          Principal: {
            Federated: provider.arn,
          },
          Condition: {
            StringEquals: {
              [`${provider.url}:aud`]: "sts.amazonaws.com",
              [`${provider.url}:sub`]: `system:serviceaccount:${namespace}:${irsaRoleName}`,
            },
          },
        },
      ],
    });
  });

  if (!assumeRolePolicy) {
    throw new Error("Failed to create assumeRolePolicy. Ensure the OIDC provider is configured correctly.");
  }

  const irsaRole = new aws.iam.Role(`role-irsa-${service}`, {
    name: irsaRoleName,
    assumeRolePolicy,
    tags: {
      ...tags,
      cluster: eksClusterName,
      service,
      namespace,
    },
  }, {
    dependsOn: [cluster],
    provider: awsProvider,
  });

  awsPolicies.forEach((policy, index) => {
    new aws.iam.RolePolicyAttachment(`policy-${service}-attachment-${index}`, {
      role: irsaRole.name,
      policyArn: policy,
    }, {
      provider: awsProvider,
    });
  });

  if (customPolicies.length > 0) {
    new aws.iam.RolePolicy(`policy-attachment-${service}-custom-policy`, {
      role: irsaRole.name,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: customPolicies.map(customPolicy => ({
          Effect: "Allow",
          Action: customPolicy.actions,
          Resource: customPolicy.resources,
        })),
      }),
    }, {
      provider: awsProvider,
    });
  }

  return irsaRole.arn;
}
