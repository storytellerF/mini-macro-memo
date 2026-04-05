/* eslint-env node */

const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('@expo/config-plugins');

const APP_ANDROID_PATH = './android/app';

const GRADLE_KEYS = {
  storeFile: 'STORYTELLER_F_SIGN_STORE_FILE',
  keyAlias: 'STORYTELLER_F_SIGN_KEY_ALIAS',
  storePassword: 'STORYTELLER_F_SIGN_STORE_PASSWORD',
  keyPassword: 'STORYTELLER_F_SIGN_KEY_PASSWORD',
};

const ENV_KEYS = {
  signPath: 'com.storyteller_f.sign_path',
  signKey: 'com.storyteller_f.sign_key',
  signAlias: 'com.storyteller_f.sign_alias',
  signStorePassword: 'com.storyteller_f.sign_store_password',
  signKeyPassword: 'com.storyteller_f.sign_key_password',
};

const DEFAULT_KEYSTORE_FILENAME = 'release.keystore';

function getEnvValue(primaryKey, fallbackKeys = []) {
  const candidates = [primaryKey, ...fallbackKeys];
  for (const key of candidates) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return undefined;
}

function getSigningEnv() {
  return {
    signPath: getEnvValue(ENV_KEYS.signPath),
    signKey: getEnvValue(ENV_KEYS.signKey),
    signAlias: getEnvValue(ENV_KEYS.signAlias),
    signStorePassword: getEnvValue(ENV_KEYS.signStorePassword),
    signKeyPassword: getEnvValue(ENV_KEYS.signKeyPassword),
  };
}

function resolveAbsolutePath(inputPath) {
  if (!inputPath) {
    return undefined;
  }

  return path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(inputPath);
}

function looksLikeFilePath(inputPath) {
  const ext = path.extname(inputPath);
  return Boolean(ext);
}

function stripBase64Prefix(base64Value) {
  const trimmed = base64Value.trim();
  if (trimmed.startsWith('data:') && trimmed.includes(',')) {
    return trimmed.split(',').slice(1).join(',');
  }
  return trimmed;
}

function resolveKeystoreMaterial(signingEnv) {
  const appAndroidAbs = path.resolve(APP_ANDROID_PATH);
  const signPathAbs = resolveAbsolutePath(signingEnv.signPath);

  if (signPathAbs && fs.existsSync(signPathAbs) && fs.statSync(signPathAbs).isFile()) {
    console.info(`Keystore file found at: ${signPathAbs}`);
    return {
      mode: 'file',
      sourceFilePath: signPathAbs,
      targetFileName: path.basename(signPathAbs),
    };
  }

  if (!signingEnv.signKey) {
    throw new Error(
      `Missing ${ENV_KEYS.signKey}. Provide an existing ${ENV_KEYS.signPath} file, or provide base64 keystore in ${ENV_KEYS.signKey}.`
    );
  }

  const base64Content = stripBase64Prefix(signingEnv.signKey).replace(/\s/g, '');
  if (!base64Content) {
    throw new Error(`${ENV_KEYS.signKey} is empty after base64 normalization.`);
  }

  let materialPath;
  if (signPathAbs) {
    if (fs.existsSync(signPathAbs) && fs.statSync(signPathAbs).isDirectory()) {
      materialPath = path.join(signPathAbs, DEFAULT_KEYSTORE_FILENAME);
    } else if (looksLikeFilePath(signPathAbs)) {
      const parentDir = path.dirname(signPathAbs);
      fs.mkdirSync(parentDir, { recursive: true });
      materialPath = signPathAbs;
    } else {
      fs.mkdirSync(signPathAbs, { recursive: true });
      materialPath = path.join(signPathAbs, DEFAULT_KEYSTORE_FILENAME);
    }
  } else {
    materialPath = path.join(appAndroidAbs, DEFAULT_KEYSTORE_FILENAME);
  }

  console.info(`Keystore material resolved: mode=${materialPath ? 'file' : 'base64'}, path=${materialPath}`);

  return {
    mode: 'base64',
    base64Content,
    materialPath,
    targetFileName: path.basename(materialPath),
  };
}

function hasAnySigningEnv(signingEnv) {
  return Object.values(signingEnv).some(Boolean);
}

function validateSigningEnv(signingEnv) {
  const requiredKeys = ['signAlias', 'signStorePassword', 'signKeyPassword'];
  const missing = requiredKeys.filter((key) => !signingEnv[key]);

  if (missing.length > 0) {
    throw new Error(
      `Android signing env is incomplete. Missing: ${missing.join(', ')}`
    );
  }
}

function withSigningGradleProperties(config, signingEnv, keystoreMaterial) {
  return withGradleProperties(config, (modConfig) => {
    const desiredProps = [
      { key: GRADLE_KEYS.storeFile, value: keystoreMaterial.targetFileName },
      { key: GRADLE_KEYS.keyAlias, value: signingEnv.signAlias },
      { key: GRADLE_KEYS.storePassword, value: signingEnv.signStorePassword },
      { key: GRADLE_KEYS.keyPassword, value: signingEnv.signKeyPassword },
    ];

    for (const { key, value } of desiredProps) {
      const existingIndex = modConfig.modResults.findIndex(
        (item) => item.type === 'property' && item.key === key
      );
      if (existingIndex >= 0) {
        modConfig.modResults[existingIndex].value = value;
      } else {
        modConfig.modResults.push({ type: 'property', key, value });
      }
    }
    console.info('Android gradle.properties configured for signing.');
    return modConfig;
  });
}

function withSigningBuildGradle(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    contents = contents.replace(
      /(release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.)debug/g,
      '$1release'
    );

    const hasReleaseSigningConfig = /signingConfigs\s*\{[\s\S]*?release\s*\{/.test(contents);
    if (!hasReleaseSigningConfig) {
      contents = contents.replace(
        /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}[\s\S]*?)(\n\s*})/,
        `$1
        release {
            if (project.hasProperty('${GRADLE_KEYS.storeFile}')) {
                storeFile file(${GRADLE_KEYS.storeFile})
                storePassword ${GRADLE_KEYS.storePassword}
                keyAlias ${GRADLE_KEYS.keyAlias}
                keyPassword ${GRADLE_KEYS.keyPassword}
            }
        }$2`
      );
    }

    console.info('Android build.gradle configured for signing.');
    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

function withSigningKeystoreCopy(config, keystoreMaterial) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const destination = path.resolve(
        APP_ANDROID_PATH,
        keystoreMaterial.targetFileName
      );

      fs.mkdirSync(path.dirname(destination), { recursive: true });

      if (keystoreMaterial.mode === 'file') {
        if (!fs.existsSync(keystoreMaterial.sourceFilePath)) {
          throw new Error(`Keystore file not found: ${keystoreMaterial.sourceFilePath}`);
        }

        if (path.resolve(keystoreMaterial.sourceFilePath) !== destination) {
          fs.copyFileSync(keystoreMaterial.sourceFilePath, destination);
        }

        console.info(`Keystore file copied to: ${destination}`);
        return modConfig;
      }

      const decoded = Buffer.from(keystoreMaterial.base64Content, 'base64');
      if (decoded.length === 0) {
        throw new Error(`${ENV_KEYS.signKey} base64 content could not be decoded.`);
      }

      fs.writeFileSync(keystoreMaterial.materialPath, decoded);

      if (path.resolve(keystoreMaterial.materialPath) !== destination) {
        fs.copyFileSync(keystoreMaterial.materialPath, destination);
      }

      console.info(`Keystore file copied to: ${destination}`);

      return modConfig;
    },
  ]);
}

function withAndroidSigning(config) {
  const signingEnv = getSigningEnv();

  if (!hasAnySigningEnv(signingEnv)) {
    console.info('No Android signing environment variables found. Skipping Android signing configuration.');
    return config;
  }

  validateSigningEnv(signingEnv);
  const keystoreMaterial = resolveKeystoreMaterial(signingEnv);

  console.info('Configuring Android signing with the provided environment variables.');

  return withSigningKeystoreCopy(
    withSigningBuildGradle(
      withSigningGradleProperties(config, signingEnv, keystoreMaterial)
    ),
    keystoreMaterial
  );
}

module.exports = withAndroidSigning;
