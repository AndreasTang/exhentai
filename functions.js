const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')
const chalk = require('chalk')
const readline = require('readline')
const progress = require('request-progress')
const cookie = '__cfduid=dfdaaeb6405cff4adb4f8ac39227e63721560420616; sk=2yarxnh10gaavfpbzn4fzram4msf; star=1-2f757657d8; hath_perks=a.t1.m1-5c05bbb77d; ipb_session_id=6c683c0567728c8c6f48cc341385ad24; ipb_member_id=1653263; ipb_pass_hash=72d2cdb5f870475e4aafc94f69958786; event=1564659662; nw=1'

const regExp = /(')(https:\/\/)(\S+)(')/

const toggle_category = (categoryIndex) => {
    const a = document.getElementById("f_cats");
    const c = document.getElementById("cat_" + categoryIndex);
    if (a.getAttribute("disabled")) {
        a.removeAttribute("disabled")
    }
    if (c.getAttribute("data-disabled")) {
        c.removeAttribute("data-disabled");
        a.value = parseInt(a.value) & (1023 ^ categoryIndex)
    } else {
        c.setAttribute("data-disabled", 1);
        a.value = parseInt(a.value) | categoryIndex
    }
}

const getAllUrl = ({name, filter}, remainBooks = null, page = 0) => {
    const pageUrl = page === 0 ? '' : `&page=${page}`
    const pageFilter = filter === '' ? '' : `&f_cats=${filter}`
    // console.log(`page: ${page}`)
    // console.log(`pageUrl: ${pageUrl}`)
    // console.log(`https://e-hentai.org/?f_search=${searchName}${pageUrl}`)
    return new Promise ((resolve, reject) => {
        request({
            method: 'GET',
            url:`https://exhentai.org/?f_search=artist:michiking%24+chinese${pageUrl}`,
            headers: {
                Cookie: cookie
            }
        }, (err, response, body) => {
                if (!err && response.statusCode === 200) {
                    const $ = cheerio.load(body)
                    let pageTotalBooks = 0
                    if (remainBooks === null) {
                        remainBooks = $('p.ip').eq(0).text().match(/\d+/g)[0]
                        if (!remainBooks) {
                            reject()
                        }
                        pageTotalBooks = remainBooks >= 25 ? 25 : remainBooks
                        console.log(chalk.green(`總數: ${remainBooks}, 獲取連結中....`))
                        remainBooks = remainBooks -25
                    } else if (remainBooks && remainBooks >= 25) {
                        remainBooks = remainBooks - 25
                        pageTotalBooks = 25
                    } else if (remainBooks && 0 < remainBooks < 25) {
                        pageTotalBooks = remainBooks
                        remainBooks = 0
                    }
                    let booksUrl = []
                    let i = 0
                    for (i = 0; i < pageTotalBooks; i++) {
                        const url = $('.glname > a').eq(i).attr('href')
                        booksUrl = [...booksUrl, url]
                        console.log(`${page + 1}-${i} got, Url: ${url}`)
                    }
                    resolve({
                        booksUrl: booksUrl,
                        remainBooks: remainBooks,
                        page: page
                    })
                } else {
                    console.log(chalk.red(`Error When Geting AllUrl at Page ${page + 1}`))
                    reject(err)
                }
            }
        )
    })
}

const enterBooks = (url) => {
    return new Promise((resolve, reject) => {
        request({
            method: 'GET',
            url: url,
            headers: {
                Cookie: cookie
            }
        }, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                const $ = cheerio.load(body)
                const isTorrentSeed = $('p.g2').find('a').eq(1).text().match(/\d+/g)[0]
                 if (isTorrentSeed != 0) {
                    const torrentDownLoad = $('p.g2').find('a').eq(1).attr('onclick')
                    resolve({
                        url: torrentDownLoad.match(regExp)[0].replace(/'/g, ''),
                        isTorrentSeed: true
                        }  
                    )
                 } else {
                     const achiveDownLoad = $('p.g2').find('a').eq(0).attr('onclick')
                     resolve({
                         url: achiveDownLoad.match(regExp)[0].replace(/'/g, ''),
                         isTorrentSeed: false
                        }
                    )
                 }
            } else {
                console.log(chalk.red(`伺服器回傳${response.statusCode}，失敗`))
                reject(err)
            }
        })
    }) 
}

const popUpWindow = ({ url, isTorrentSeed }, backUpUrl) => {
    return new Promise((resolve, reject) => {
        request({
            method: 'GET',
            url: url,
            headers: {
                Cookie: cookie
            },
        }, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                const $ = cheerio.load(body)
                if (isTorrentSeed) {
                    const tbody = $('tbody')
                    const numberOfLinks = tbody.length
                    const downLoadLink = tbody.eq(numberOfLinks -1).find('tr').eq(2).find('td a').attr('onclick')
                    const fileName = tbody.eq(numberOfLinks -1).find('tr').eq(2).find('td a').text()
                    resolve({
                        url: downLoadLink.match(regExp)[0].replace(/'/g, ''),
                        linkName: fileName,
                        isTorrentSeed: isTorrentSeed,
                        gp: false
                    })
                } else {
                    const isFree = $('strong').eq(0).text() === 'Free!' ? true : false
                    const linkName = $('h1').text()
                    const url = $('form').eq(0).attr('action')

                    if (isFree) {
                        resolve({
                            url: url,
                            linkName: linkName,
                            isTorrentSeed: isTorrentSeed,
                            gp: false
                        })
                    } else {
                        console.log(`${linkName} 需要 GP: ${$('strong').eq(0).text()}`)
                        const content = `書名: ${linkName}\r\n${backUpUrl}\r\nGp: ${$('strong').eq(0).text()}\r\n`
                        fs.appendFile('Money.txt', content, (err) => {
                            if (err) {
                                console.log(`${linkName} 寫入失敗`)
                            } else {
                                console.log(`${linkName} 寫入成功`)
                            }
                        })
                        resolve({
                            url: url,
                            linkName: linkName,
                            gp: true
                        })
                    }
                }
                
            } else {
                console.log(chalk.red(`伺服器回傳${response.statusCode}，失敗`))
                reject(err)
            }
        })
    })
}

const getAchiveDownLoadLink = ({ url }) => {
    return new Promise((resolve, reject) => {
        request({
            method: 'POST',
            url: url,
            followAllRedirects: true,
            formData: {
                dltype: 'org',
                dlcheck: 'Download Original Archive'
            },
            headers: {
                Cookie: cookie
            } 
        }, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                const $ = cheerio.load(body)
                const link = $('a').attr('href')
                const ip = link.match(/(http:\/\/)(\d+\.\d+\.\d+\.\d+)/)[0]
                request({
                    method: 'GET',
                    url: link,
                    followAllRedirects: true,
                    headers: {
                        Cookie: cookie
                    }
                }, (err, response, body) => {
                    if (!err && response.statusCode === 200) {
                        const $ = cheerio.load(body)
                        const fileName = $('strong').text()
                        const achiveLink = $('a').attr('href')
                        resolve({
                            url: `${ip}${achiveLink}`,
                            fileName: fileName,
                            isTorrentSeed: false
                        })
                    }
                })
            } else {
                console.log(chalk.red(`伺服器回傳${response.statusCode}，失敗`))
                reject(err)
            }
        })
    })
}

const downloadTorrent = ({ linkName, url }, i) => {
    const pathName = `./BT/${i}.${linkName}.torrent`
    const option = {
        method: 'GET',
        url: url,
        headers: {
            Referer: url,
            Cookie: 'u=1653263-1-uergmpl9bcs'
        }
    }
    return new Promise ((resolve, reject) => {
        request(option).on('error', () => {
            console.log(chalk.red(`${linkName} 獲取失敗`))
            reject()
        })
        .pipe(fs.createWriteStream(pathName)
        .on('finish', () => {
            resolve()
        }))
    })
}

const downloadAchive = ({ fileName, url }, counter) => {
    const pathName = `./Achive/${fileName}.zip`
    const option = {
        method: 'GET',
        url: url,
        headers: {
            Referer: url,
            Cookie: cookie
        }
    }
    return new Promise ((resolve, reject) => {

        // const rl = readline.createInterface({
        //     input: process.stdin,
        //     output: process.stdout
        //   });
        
        progress(request(option).on('error', () => {
            console.log(chalk.red(`${counter + 1}. ${fileName} 獲取失敗`))
            reject()
        })
        .on('progress', (state) => {
            // readline.clearLine(rl, 0)
            // readline.cursorTo(rl, 0)
            // rl.write(statusbar(fileName, state))
        })
        .on('error', (err) => {
            console.log(chalk.red(`${fileName}  ${err}`))
            reject()
        })
        .on('end', () => {
            console.log(chalk.green(`${counter + 1}. ${fileName} 下載成功`))
            resolve(counter)
        })
        .pipe(fs.createWriteStream(pathName))

    )})
}

const statusbar = (fileName, progress) => {
    let str = `${fileName}`
    str += progressBar(progress.percent)
    str += stats(progress)
    return str
}

const progressBar = (percent) => {
    percent = Math.floor(percent * 100)
    let str = `%${percent}`
    str += '='.repeat(percent)
    str += '>'
    str += ' '.repeat(99 - percent)
    str += '] '
    return str
}

const stats = (speed, size, time) => {
    const sizeM = Math.round(size.transferred / 1024)
    const speedMb = Math.round(speed * 0.000008)
    const eta = new Date(time.remaining * 1000).toISOString().substr(11, 8)
    return `${sizeM}M ${speedMb}MB/s ETA ${eta}`
}

let a ='ggg'

module.exports = {
    getAllUrl,
    enterBooks,
    popUpWindow,
    downloadTorrent,
    downloadAchive,
    getAchiveDownLoadLink
}