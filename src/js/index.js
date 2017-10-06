require(['avalon',"domReady!"], function() {
    var conf = {
        gg:[{"id":"1","title":"公告文章标题1"},{"id":"2","title":"公告文章标题2"},{"id":"3","title":"公告文章标题3"},{"id":"4","title":"公告文章标题4"}],
        bd:[{"id":"1","title":"媒体报道文章标题1"},{"id":"2","title":"媒体报道文章标题2"},{"id":"3","title":"媒体报道文章标题3"},{"id":"4","title":"媒体报道文章标题4"}]
    };
    var vm = avalon.define({
        $id: "list",
        more_name: "gg",
        more_text: "更多公告",
        gg:conf.gg,
        bd:conf.bd,
        infoList:conf.gg,
        changeUl:function(flag){
            if(flag){
                vm.more_name = "gg";
                vm.more_text = "更多公告";
                vm.infoList = vm.gg;
            }else{
                vm.more_name = "bd";
                vm.more_text = "更多报道";
                vm.infoList = vm.bd;
            }
        }
    });
    avalon.scan(document.body);
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
});
