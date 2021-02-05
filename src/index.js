const fs = require('fs')
const path = require('path')

const domains = require('./domain')
const CACHE_PATH = path.resolve(__dirname, './newhost')

const { exec } = require('child_process')
exec(
  "curl -H 'accept: application/dns-json' 'https://1.1.1.1/dns-query?name=gist.githubusercontent.com&type=a'",
  (error, dnsRes, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    let ips = JSON.parse(dnsRes).Answer.reduce((pre, cur) => {
      if (cur.type === 1) {
        pre.push(cur.data)
      }
      return pre
    }, [])

    console.log(`ip get: `, ips)
    const select = 0
    console.log('目前选择的ip', ips[select])
    // 读取本地hosts
    const local = fs.readFileSync('/etc/hosts', { encoding: 'utf-8' })
    // 匹配的正则
    const reg = /(?<=(# github-host start))([\s\S]*)(?=(# github-host end))/
    let nextHosts = ''
    // 生成插入的新host映射
    const newHostRef = domains(ips[select])
    console.log('new host ref: ', newHostRef)

    // // 添加或修改
    if (local.match(reg)) {
      nextHosts = local.replace(reg, newHostRef)
    } else {
      nextHosts = `
${local}

# github-host start
      ${newHostRef}
# github-host end

`
    }

    // console.log('nextHosts:', nextHosts)

    // 打开并写入缓存文件
    let fd = fs.openSync(CACHE_PATH, 777)
    fs.writeSync(fd, nextHosts, 0, { encoding: 'utf-8' })
    fs.closeSync(fd)
    // 写入host2
    
    exec(`cat ${path.resolve(__dirname, './newhost')} > /etc/hosts`, error => {
      console.log(error)
      console.log('github new host apply success!')
    })
  },
)
