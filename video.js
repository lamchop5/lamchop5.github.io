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
        if (rect.width>(image.cols*.9) && rect.height<(image.rows*.1)) {
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
                let top = (rect.y+(rect.height*.725)) | 0
                let left = (rect.x+(rect.width*.225)) | 0
                let height = (rect.height*.35) | 0
                let width = (rect.width*.85) | 0
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
