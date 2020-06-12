const allFunctions = require('./functions')
const chalk = require('chalk')
let allUrl = []
let allPopUpUrl = []
let torrentLinks = []
let achiveLinks = []
let gpLinks = []
let achiveDownLoadLinks = []
const searchName = {
    name: 'gibuchoko+chinese',
    filter: '256'
}


const urlAsync = async() => {
    console.log(chalk.green(`您選擇的搜索條件為: ${searchName.name}, 開始爬蟲.....`))
    try {
        console.log(chalk.green(`程式開始`))

        //確認本本總數並開始抓取第一頁
        let pageInf = await allFunctions.getAllUrl(searchName)
        allUrl = [...allUrl, ...pageInf.booksUrl]

        //本本總數大於1頁則繼續抓取
        while (pageInf.remainBooks > 0) {
            pageInf = await allFunctions.getAllUrl(searchName, pageInf.remainBooks, pageInf.page +1)
            allUrl = [...allUrl, ...pageInf.booksUrl]
        }

        console.log(chalk.green(`總數: ${allUrl.length} 本, 開始抓取每一本的連結`))

        //進入每一本抓取跳窗網址，並確認有無BT種子
        for (let i = 0; i < allUrl.length; i++) {
            const popUpUrl = await allFunctions.enterBooks(allUrl[i])
            allPopUpUrl = [...allPopUpUrl, popUpUrl]
            console.log(`${i + 1}. ${popUpUrl.isTorrentSeed ? 'Torrent' : 'Achive'}跳窗連結抓取, ${popUpUrl.url}`)
        }

        console.log(chalk.green(`總共 ${allPopUpUrl.length} 連結抓取, 開始尋找下載連結`))

        //抓取跳窗內的連結並依照是否BT分類
        for (let i = 0; i < allUrl.length; i++) {
            const popUpPageUrl = await allFunctions.popUpWindow(allPopUpUrl[i], allUrl[i])
            console.log(`${i + 1}. ${popUpPageUrl.isTorrentSeed ? 'Torrent' : 'Achive'}連結抓取 ${popUpPageUrl.url}`)
            if (popUpPageUrl.isTorrentSeed && !popUpPageUrl.gp) {
                torrentLinks = [...torrentLinks, popUpPageUrl]
            } else if (!popUpPageUrl.gp && !popUpPageUrl.isTorrentSeed) {
                achiveLinks = [...achiveLinks, popUpPageUrl]
            } else {
                gpLinks = [...gpLinks, popUpPageUrl]
            }
            console.log(chalk.green(`總共: ${allUrl.length} 目前: ${i + 1}, BT: ${torrentLinks.length}, Achive: ${achiveLinks.length}, GP: ${gpLinks.length}`))
        }

        // 抓取BT檔案
        for (let i = 0; i < torrentLinks.length; i++) {
            allFunctions.downloadTorrent(torrentLinks[i], i)
            console.log(`${i + 1}. ${torrentLinks[i].linkName} 下載完成`)
        }
        console.log(chalk.green(`全部 ${torrentLinks.length}種子 下載完成`))

        //抓取achive下載連結
        for (let i = 0; i < achiveLinks.length; i++) {
            const achiveDownLoadLink = await allFunctions.getAchiveDownLoadLink(achiveLinks[i])
            achiveDownLoadLinks = [...achiveDownLoadLinks, achiveDownLoadLink]
        }
        //抓取achive
        
         for (let i = 0; i < achiveDownLoadLinks.length; i++) {
            console.log(chalk.green(`開始下載第${i + 1}個achive`))
            allFunctions.downloadAchive(achiveDownLoadLinks[i], i)
        }
        console.log(chalk.green(`全部 ${achiveDownLoadLinks.length} 排入下載，請耐心等候`))

    } catch(error) {
        console.log(error)
    }
}


urlAsync()

