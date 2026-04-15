# 智能体技能分享

## 问题: 如何进行点对点的分享skill
使用nodejs开发两个包，以交互式命令行的形式（prompt.js）让用户之间分享个人的skill。
解决skill不方便上传公网，又或者上传公/内网麻烦，同事之间有好的skill, 却又不方便共享skill的痛点。

## coco design

### coco-green（输出端）
  coco-green 负责将个人的技能分享出去。流程如下：
   通过以下命令启动：npx coco-green（启动时可以输出一些欢迎语，并输出本工具的一些介绍）
  1.  启动一个http服务 监听指定端口， 端口默认值 3001 可根据 --port=xxx 指定端口
  2.  通过交互式命令行引导用户输入需要分享的技能所在的根路径，需要输入绝对路径。并且该路径默认值为当前代码运行时的目录，该默认路径需要提示给用户。如果用户直接回车则默认应用该路径。该路径可以通过 --path=xxxx指定，如用户指定则不在使用交互式命令行询问用户。
  3.  终端输入提示：coco-green已经启动，ip地址为: 内网地址：端口
  4.  监听http请求，需要提供如下接口供coco-blue调用
      - getAllSkills 
        获取用户指定的目录下所有的skills，返回skill的name和description
      - getSkillBySkillNames
        接受一个nameList参数, 批量下载skills.

### coco-blue （输入端）
  coco-blue 负责从输出端下载skill, 并将skill放置在用户指定的文件夹中。流程如下：
  通过以下命令启动：npx coco-blue（启动时可以输出一些欢迎语，并输出本工具的一些介绍）
  1. 通过交互式命令行，询问用户从哪个ip获取skills。该字段是一个内网ip+端口，即coco-green第3步输出的提示内容。 该ip可以通过 --ip=xxx指定，如用户指定不在使用交互式命令行询问用户。（ip需要校验）
  2. 根据用户输入的ip，调用getAllSkills获取coco-green输出的skills列表，将name description展示出来，供用户选择，**用户可多选**
  3. 使用交互式命令行选择skill需要安装的智能体。目前阶段支持三个智能体（cursor claudeCode codex）,选项在代码中以枚举的形式写死即可。**该项支持多选**
  4. 选择完成智能体后询问用户是安装到全局还是指定目录。如果安装到全局则根据操作系统，例如mac智能体根目录为：~/.claude/skills ~/.cursor/skills-cursor ~/.codex/skills (以上三个目录你需要判断下是否正确，并且我不知道windows系统对应的路径是什么，你需要自己寻找)
  5. 如果选择安装到指定目录，使用交互式命令行引导用户输入安装目录。安装目录默认当前代码运行的目录，需要默认目录的绝对路径展示出来。同样可以使用--path指定目录
  6.  安装完成后输出提示即可
  

### 要求
1. 在skill-share下开发
2. 全部使用typescript, 使用typescript standard规范
3. 使用pnpm mono repo
4. 这两个包需要上传到npm上的 帮我在package.json中增加打包、发布脚本。
5. 使用koa2作为http服务
6. 使用prompt作为命令行交互工具




## coco stage2 易用性提升
1. coco green 在启动时可以让用户选择主动/被动分享模式， 并可以通过 --mode参数控制
   - 主动分享模式，coco-green在输入技能目录之后，可以自己选择想要分享出去的技能，选择完成后，在控制台输出命令，例如：npx @coco-share/coco-blue --ip='coco-green的服务地址' --skills=skillA,skillB，SkillC。分享人直接将控制台的命令复制给接受人，接收人直接执行这行命令，选择完安装目录即可安装技能。
   - 被动分享模式，按照原有流程执行，接受人自己选需要的技能即可。

2. coco-blue coco-green 的获取命令行参数的那部分代码是可以服用的代码，且代码组织形式不符合开闭原则，命令行参数是经常需要拓展的，你重新设计这部分。

3. coco-blue coco-green 我需要实现成cli模式，可以通过 -v -h 获取命令帮助 版本号等。