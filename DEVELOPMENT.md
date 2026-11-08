# 开发指南

## SDK 与构建要求

应用使用 Expo SDK 58、React Native 0.88.1，以及 Node.js 26 或更新版本。CI 和 Web Docker 构建使用 Node.js 26；Expo 58 不支持 Node.js 25。Expo prebuild 根据 SDK 58 模板生成 Gradle 9.4.1。不要通过修改被忽略的原生目录，脱离 SDK 单独升级 Wrapper。

React 与 React DOM 保持 19.3.1，Worklets 保持 0.13.1，以保留 Dependabot 的补丁更新。这些版本满足 React Native 的 React peer 版本范围，以及 Reanimated 4.7 对 Worklets 0.13.x 的兼容范围。SDK 当前精确推荐 19.3.0 和 0.13.0，因此 `expo.install.exclude` 只针对这两项具体推荐设置例外。Expo 推荐变化时重新评估这些例外，不要用它们绕过其他发布系列的检查。

使用 `npm ci` 安装后运行以下检查：

```sh
npx expo install --check
npx expo-doctor
npx tsc --noEmit
npm run lint
npx expo export --platform all
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
```

Windows 上最后一条命令使用 `gradlew.bat`。原生编译需要本地 Android SDK 和 JDK。GitHub 工作流先执行兼容性、类型和 lint 检查，再生成并构建 release APK。Expo 配置插件将诊断输出到 stderr，确保 `npx expo config --json` 等命令在 stdout 输出有效 JSON。

SDK 58 Router 组件使用 `expo-router/tabs` 和 `expo-router/react-navigation` 导出的导航类型与基础组件。Router 自定义标签按钮应使用这些导出，确保类型与 Router 内置导航组件匹配。

## Android CI 缓存

Android 工作流使用 `gradle/actions/setup-gradle` 缓存 Gradle User Home，包括 Wrapper 分发包和下载的依赖。只有 `main` 写入缓存；pull request、tag 和其他分支只读恢复。Gradle 版本仍由 `npx expo prebuild` 生成的 Wrapper 决定。生成的 Android 项目和签名文件不包含在此缓存中。

验证变更时，先在 `main` 运行工作流填充缓存，再打开 pull request，查看 setup-gradle 恢复日志和作业摘要。两次运行都必须从干净检出完成 prebuild、`assembleRelease` 和 APK artifact 上传。比较构建耗时和缓存传输大小；仅命中缓存不能证明提速。更改 Expo 依赖或生成的 Wrapper 版本后，确认构建正确解析所需版本。tag 构建继续使用已有的独立 GitHub Release 上传作业。

## 依赖更新

Dependabot 每周检查根目录 npm 依赖、GitHub Actions 和 Docker 基础镜像。每种生态最多允许五个未关闭的版本更新 pull request。npm 的 minor 和 patch 更新合并分组，Actions 的 minor 和 patch 更新也分别合并分组；major 更新保持独立，便于审查。更新不会自动合并。Expo、React Native 和原生模块更新必须根据目标 SDK 的兼容性表一起审查，即使 Dependabot 将其标记为 minor 更新，例如 React Native 0.x 版本。

npm 更新先运行 `npm ci` 和 `npx expo install --check`，确认 Expo SDK 兼容性，再审查 Android 构建。Dependabot 不管理 Expo prebuild 生成的 Gradle 文件。只有 `.github/dependabot.yml` 出现在仓库默认分支时配置才会生效；fork 仓库还需要在 Settings 中启用 Dependabot 版本更新。
