# 欢迎使用你的 Expo 应用 👋

这是使用 [`create-expo-app`](https://www.npmjs.com/package/create-expo-app) 创建的 [Expo](https://expo.dev) 项目。

## Android 版本发布

推送 tag 会构建 Android release APK，并上传到对应的 GitHub Release。上传在单独的作业中执行，只在 Release 不存在时创建；重新运行时替换同名附件。分支和 pull request 的构建产物仍可通过 Actions artifacts 获取。签名使用已有的 `COM_STORYTELLER_F_SIGN_*` secrets，由 Expo 签名插件读取。

## 开始使用

1. 安装依赖

```bash
   npm install
   ```

2. 启动应用

```bash
   npx expo start
   ```

命令输出会提供以下打开应用的选项：

- [开发构建](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android 模拟器](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS 模拟器](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)：用于尝试 Expo 应用开发、功能有限的沙盒环境

可以通过编辑 **app** 目录中的文件开始开发。本项目使用[基于文件的路由](https://docs.expo.dev/router/introduction)。

## 重置为全新项目

准备好后，运行：

```bash
npm run reset-project
```

该命令将初始示例代码移动到 **app-example** 目录，并创建空白的 **app** 目录，供你开始开发。

## 了解更多

以下资源可以帮助你进一步了解 Expo 项目开发：

- [Expo 文档](https://docs.expo.dev/)：学习基础知识，或通过[指南](https://docs.expo.dev/guides)了解进阶主题。
- [Learn Expo 教程](https://docs.expo.dev/tutorial/introduction/)：按步骤创建可在 Android、iOS 和 Web 上运行的项目。

## 加入社区

加入构建跨平台应用的开发者社区。

- [GitHub 上的 Expo](https://github.com/expo/expo)：查看开源平台并参与贡献。
- [Discord 社区](https://chat.expo.dev)：与 Expo 用户交流和提问。
