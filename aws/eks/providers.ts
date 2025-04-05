import * as aws from "@pulumi/aws"; // AWS Pulumi SDK
import * as github from "@pulumi/github"; // GitHub Pulumi SDK
import * as kubernetes from "@pulumi/kubernetes"; // Kubernetes Pulumi SDK
import * as pulumi from "@pulumi/pulumi"; // Pulumi core SDK


import { cluster } from "./eks"; // EKS cluster resource from a local module
import { githubOwner, region } from "./variables"; // Configuration variables

// Ensure the GITHUB_TOKEN is defined
const githubToken = process.env.GITHUB_TOKEN
    ? pulumi.secret(process.env.GITHUB_TOKEN)
    : (() => { throw new Error("GITHUB_TOKEN is not set"); })();

// Create the GitHub provider with the secret token
export const githubProvider = new github.Provider("github", {
  token: githubToken, // GitHub token for authentication as a secret
  owner: githubOwner,  // GitHub organization or user
});

// Configure the Kubernetes provider using the EKS cluster's kubeconfig
export const k8sProvider = new kubernetes.Provider("k8s", {
  kubeconfig: cluster.kubeconfig.apply(JSON.stringify), // Convert kubeconfig to JSON string
}, {
  dependsOn: cluster, // Ensure this provider is set up after the EKS cluster is created
});
