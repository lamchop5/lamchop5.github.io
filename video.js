// x mapping for Alibaba-PuHuiTi-Heavy.ttf
const characterTableEng = [
    { min: 8, max: 28, char: '0' },
    { min: 70, max: 90, char: '1' },
    { min: 130, max: 150, char: '2' },
    { min: 190, max: 210, char: '3' },
    { min: 251, max: 271, char: '4' },
    { min: 311, max: 331, char: '5' },
    { min: 372, max: 392, char: '6' },
    { min: 433, max: 453, char: '7' },
    { min: 493, max: 513, char: '8' },
    { min: 553, max: 573, char: '9' },
    { min: 613, max: 633, char: 'P' },
    { min: 678, max: 698, char: 'T' },
    { min: 737, max: 757, char: 'B' },
    { min: 855, max: 875, char: 'i' },
    { min: 797, max: 817, char: 'Q' },
    { min: 889, max: 909, char: '.' }
];

function getChar(input) {
    // helper function to lookup character mapping from templatematching results
    const entry = characterTableEng.find(range => input >= range.min && input <= range.max);
    return entry ? entry.char : null; // Returns null if no range is found
}

function filterImage(image, color, threshold) {
    // filter image by color +/- thresh, returns mask
    const lowthresh = color.map((e,i) => e - threshold[i]);
    const highthresh = color.map((e,i) => e + threshold[i]);

    let low = new cv.Mat(image.rows, image.cols, image.type(), lowthresh);
    let high = new cv.Mat(image.rows, image.cols, image.type(), highthresh);


    let imgInRange = new cv.Mat();
    cv.inRange(image, low, high, imgInRange);

    let imgInRangeNot = new cv.Mat();
    cv.bitwise_not(imgInRange, imgInRangeNot);

    imgInRange.delete();
    low.delete()
    high.delete()

    return imgInRangeNot;
}

function checkStart(image){
    // get only the damage skills area from screenshot
    let orange_filtered = new cv.Mat();
    orange_filtered = filterImage(image, [253, 152, 28,128],[20,20,20,128])

    // findContours assumes black bg and white contours, prepare Mat and invert
    let dst = new cv.Mat();
    cv.bitwise_not(orange_filtered, dst) //invert
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let hpbar_found = false;

    // find max area and save contour index
    for (let i = 0; i < contours.size(); i++) {
        let cnt = contours.get(i);
        // Get the bounding rectangle (x, y, w, h)
        let rect = cv.boundingRect(cnt);
        if (rect.width>(image.cols*.8) && rect.height>10) {
            hpbar_found = true;
            break;
        }
    }
    orange_filtered.delete()
    dst.delete();
    contours.delete();
    hierarchy.delete();
    return hpbar_found;
}

function findCbeltIcon(image){
    // get only the damage skills area from screenshot
    let black_filtered = new cv.Mat();
    black_filtered = filterImage(image, [25, 25, 25, 128],[25, 25, 25, 128])

    // findContours assumes black bg and white contours, prepare Mat and invert
    let dst = new cv.Mat();
    cv.bitwise_not(black_filtered, dst) //invert
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let max_y = 10000;
    let retval = {
        x: null, y: null, w: null, h: null
    };

    // find max area and save contour index
    for (let i = 0; i < contours.size(); i++) {
        let cnt = contours.get(i);
        // Get the bounding rectangle (x, y, w, h)
        let rect = cv.boundingRect(cnt);
        // if width and height within 10 pixels
        if (Math.abs(rect.width-rect.height)<10 && rect.width>50 && rect.height>50) {
            if (rect.y < max_y) {
                let top = (rect.y+(rect.height*.75)) | 0
                let height = (rect.height*.3) | 0
                let left = (rect.x+(rect.width*.15)) | 0
                let width = (rect.width*.9) | 0
                retval = {x:left, y:top, w:width, h:height}
            }
        }
    }
    black_filtered.delete()
    dst.delete();
    contours.delete();
    hierarchy.delete();
    return retval;
}

function getDamageWindow(image){
    // get only the damage skills area from screenshot
    let grey_filtered = new cv.Mat();
    grey_filtered = filterImage(image, [90,95,118,128],[15,15,15,128])

    // findContours assumes black bg and white contours, prepare Mat and invert
    let dst = new cv.Mat();
    cv.bitwise_not(grey_filtered, dst) //invert
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let maxContourIndex = -1;

    // find max area and save contour index
    for (let i = 0; i < contours.size(); i++) {
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt, false); // Calculate the area
        if (area > maxArea) {
            maxArea = area;
            maxContourIndex = i;
        }
    }
    // crop the area and return it
    if (maxContourIndex !== -1) {
        let maxContour = contours.get(maxContourIndex);
        let boundingRect = cv.boundingRect(maxContour);
        // boundingRect.height = (boundingRect.height * 1.5) | 0;
        let crop = image.roi(boundingRect);
        
        maxContour.delete();
        grey_filtered.delete()
        dst.delete();
        contours.delete();
        hierarchy.delete();

        return crop;        

    } else {
        console.log("No contours found.");
        grey_filtered.delete()
        dst.delete();
        contours.delete();
        hierarchy.delete();
    }
}

function getWordArea(image) {
    let l = 0;
    let r = image.cols;
    let t = 0;
    let b = image.rows;

    // find left most
    for (let x = 0; x < image.cols; x++) {
        // Define ROI for single column: Rect(x, y, width, height)
        let rect = new cv.Rect(x, 0, 1, image.rows);
        let column = image.roi(rect);
        let mean = cv.mean(column);
        if (mean[0]<255) {
            l = x-1;
            column.delete(); // Free memory
            break;
        } // if not white bg for whole column, black it for mask        
    }
    // find right most
    for (let x = image.cols-1; x >= 0; x--) {
        // Define ROI for single column: Rect(x, y, width, height)
        let rect = new cv.Rect(x, 0, 1, image.rows);
        let column = image.roi(rect);
        let mean = cv.mean(column);
        if (mean[0]<255) {
            r = x+1;
            column.delete(); // Free memory
            break;
        } // if not white bg for whole column, black it for mask        
    }
    // find top most
    for (let y = 0; y < image.rows; y++) {
        // Define ROI for single column: Rect(x, y, width, height)
        let rect = new cv.Rect(0, y, image.cols, 1);
        let row = image.roi(rect);
        let mean = cv.mean(row);
        if (mean[0]<255) {
            t = y-1;
            row.delete(); // Free memory
            break;
        } // if not white bg for whole column, black it for mask        
    }
    // find bottom most
    for (let y = image.rows-1; y >= 0; y--) {
        // Define ROI for single column: Rect(x, y, width, height)
        let rect = new cv.Rect(0, y, image.cols, 1);
        let row = image.roi(rect);
        let mean = cv.mean(row);
        if (mean[0]<255) {
            b = y+1;
            row.delete(); // Free memory
            break;
        } // if not white bg for whole column, black it for mask        
    }
    return [l,t,r-l,b-t]
}

function readWord(image) {    
    let start = 0;
    let end = 0;

    // load master template file that holds all the digits/letters 
    let templateMat = cv.imread(templateElement);
    let templateMatGrey = new cv.Mat();
    try {
        cv.cvtColor(templateMat, templateMatGrey, cv.COLOR_RGBA2GRAY);
    } catch (error) {
        console.log("error template greyscale: "+error)
    }
    cv.imshow('templateOutput', templateMatGrey);
    

    let letterCount = 0;
    let word = "";
    for (let x = 0; x < image.cols; x++) {
        // Define ROI for single column: Rect(x, y, width, height)
        let rect = new cv.Rect(x, 0, 1, image.rows);
        let column = image.roi(rect);
        let mean = cv.mean(column);
        if (start==0 && mean[0]<255) {
            start=x-1;
        } else if (start!=0 && mean[0]==255) {
            letterCount++;
            //console.log("letter "+letterCount)
            let charCrop = new cv.Mat();
            let charRect = new cv.Rect(start,0,x-start,image.rows); // x, y, w, h
            charCrop = image.roi(charRect);

            let top = 0
            let bottom = charCrop.rows

            // find top most
            for (let y = 0; y < charCrop.rows; y++) {
                // Define ROI for single column: Rect(x, y, width, height)
                let vrect = new cv.Rect(0, y, charCrop.cols, 1);
                let row = charCrop.roi(vrect);
                let mean = cv.mean(row);
                if (mean[0]<255) {
                    top = y-1;
                    row.delete(); // Free memory
                    break;
                } // if not white bg for whole column, black it for mask        
            }
            // find bottom most
            for (let y = charCrop.rows-1; y >= 0; y--) {
                // Define ROI for single column: Rect(x, y, width, height)
                vrect = new cv.Rect(0, y, charCrop.cols, 1);
                row = charCrop.roi(vrect);
                mean = cv.mean(row);
                if (mean[0]<255) {
                    bottom = y+1;
                    row.delete(); // Free memory
                    break;
                } // if not white bg for whole column, black it for mask
            }
            charRect = new cv.Rect(0, top, charCrop.cols, bottom-top); // x, y, w, h
            charCrop = charCrop.roi(charRect)

            //console.log("char dimensions before resize : "+charCrop.rows + "x" + charCrop.rows);
            // resize char to match template height
            let dsize = new cv.Size((templateHeight/charCrop.rows*charCrop.cols) | 0, templateHeight);
            cv.resize(charCrop, charCrop, dsize, 0, 0,cv.INTER_CUBIC);

            let dst = new cv.Mat();
            try {
                cv.matchTemplate(templateMatGrey, charCrop, dst, cv.TM_CCOEFF_NORMED);
            } catch (error) {
                console.log("template match error:"+error)
            }

            let result = cv.minMaxLoc(dst);
            let maxVal = result.maxVal;
            let matchLoc = result.maxLoc; // For TM_CCOEFF_NORMED
            let char = getChar(matchLoc.x)
            //console.log("maxVal: " + maxVal + " at x = " + matchLoc.x)
            mean = cv.mean(charCrop);
            //if (mean[0]<80) {char='.'} 
            if (char == null) {cv.imshow('charOutput',charCrop)}
            word += char;
            //console.log(char + " average mean of charCrop : "+mean)

            start=0;
            charCrop.delete();
            dst.delete();
        }
        
        column.delete(); // Free memory
    }
    templateMat.delete();
    templateMatGrey.delete();
    return word;
}


function getSkillDamages(image) {
    // filter grey skill icon bg to search for skill icons
    let grey_filtered = new cv.Mat();
    grey_filtered = filterImage(image, [53,60,80,128],[10,10,10,128])

    // assumes white bg, black contours
    let dst = new cv.Mat();
    cv.bitwise_not(grey_filtered, dst)

    // Find all contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let numContours = 0

    // cycle through contours to search for SKILL ICONS
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let rect = cv.boundingRect(contour);
        // only look for contours > 75 x 75, assume its a skill icon
        if (rect.width > 75 && rect.height > 75) {
            numContours += 1;
            // draw icon box
            cv.drawContours(image, contours, i, [0,255,0,255], 1, cv.LINE_8, hierarchy, 100);

            // draw damage text area to scan 
            let pt1 = new cv.Point(image.cols*.7|0, rect.y+(rect.height/2|0));
            let pt2 = new cv.Point(image.cols, rect.y+rect.height);
            cv.rectangle(image, pt1, pt2, [0,255,0,255], 1, cv.LINE_8);
            
            // get general area of this skill icons damage word
            let cropRect = new cv.Rect(image.cols*.7|0, rect.y+(rect.height/2|0), image.cols*.29|0, rect.height/2|0);
            let crop = new cv.Mat();
            crop = image.roi(cropRect)
            // filter white text
            crop = filterImage(crop, [220,220,220,128],[35,35,35,128])
            
            // get bounding box of the damage word from the general area
            //let wordArea = [];
            //wordArea = getWordArea(crop);
            //let wordRect = new cv.Rect(wordBound[0], wordBound[1], wordBound[2], wordBound[3]);
            //let wordCrop = new cv.Mat();
            //wordCrop = crop.roi(wordRect)
            //wordCrop.delete();

            cv.imshow('testOutput', crop);
            console.log("word = " + readWord(crop));
            crop.delete();
        }
    }

    grey_filtered.delete();
    dst.delete()
    hierarchy.delete();
    return numContours
    //return dst;
}
