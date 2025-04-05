import * as aws from "@pulumi/aws"; // AWS Pulumi SDK
import * as github from "@pulumi/github"; // GitHub Pulumi SDK
import * as kubernetes from "@pulumi/kubernetes"; // Kubernetes Pulumi SDK

import { cluster } from "./eks"; // EKS cluster resource from a local module
import { accountId, awsPulumiRoleName, githubOwner, region } from "./variables"; // Configuration variables

// Configure the AWS provider
const awsProvider = new aws.Provider("aws", {
  region: region, // The region should be a variable or string, like 'us-west-2'
  assumeRole: {
      roleArn: `arn:aws:iam::${accountId}:role/${awsPulumiRoleName}`, // Replace with your role ARN
      sessionName: "Pulumi", // Customize session name
  },
  // OIDC configuration (this assumes you're using Pulumi's automatic OIDC setup)
  profile: "pulumi", // If using Pulumi's default profile for authentication
});

// Configure the GitHub provider
export const githubProvider = new github.Provider("github", {
  token: process.env.GITHUB_TOKEN, // GitHub token for authentication
  owner: githubOwner, // GitHub organization or user
});

// Configure the Kubernetes provider using the EKS cluster's kubeconfig
export const k8sProvider = new kubernetes.Provider("k8s", {
  kubeconfig: cluster.kubeconfig.apply(JSON.stringify), // Convert kubeconfig to JSON string
}, {
  dependsOn: cluster, // Ensure this provider is set up after the EKS cluster is created
});
