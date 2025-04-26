const getEnvVar = (envVariableName: string): string => {
  const envVariable = process.env[envVariableName];
  if (envVariable === undefined) throw Error(`${envVariable} undefined`);
  return envVariable;
};

export { getEnvVar };
