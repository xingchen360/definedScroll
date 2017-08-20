"use strict";
(function(win, doc, $) {
	//构造函数
	function CusScrollBar(options) {
		this._init(options);
	}
	/*把以下初始化方法重写为下面使用extend方法实现的方式
	 * CusScrollBar.prototype._init = function(){
		console.log("test");
	}*/
	$.extend(CusScrollBar.prototype, {
		_init: function(options) {
			var self = this;
			self.options = {
				scrollDir: "y", //滚动方向
				contSelector: "", //滚动内容区选择器
				barSelector: "", //滚动条选择器
				sliderSelector: "", //滚动滑块选择器
				tabItemSelector: ".tab-item", //标签选择器
				tabActiveClass: "tab-active", //选中标签类名
				anchorSelector: ".anchor", //锚点选择器
				correctSelector: ".correct-bot", //校正元素
				articleSelector: ".scroll-ol", //文章选择器
				wheelStep: 10 //滚轮步长
			};
			$.extend(true, self.options, options || {});
			self._initDomEvent();
			return self;
		},
		/**
		 * 初始化DOM引用
		 */
		_initDomEvent: function() {
			var self = this;
			var opts = this.options;
			this.$cont = $(opts.contSelector);
			this.$slider = $(opts.sliderSelector);
			this.$bar = opts.barSelector ? $(opts.barSelector) : self.$slider.parent();
			//标签项
			this.$tabItem = $(opts.tabItemSelector);
			//锚点项
			this.$anchor = $(opts.anchorSelector);
			//正文
			this.$article = $(opts.articleSelector);
			//校正元素对象
			this.$corret = $(opts.correctSelector);
			//获取文档对象
			this.$doc = $(doc);
			this._initSliderDragEvent()._bindContScroll()._bindMousewheel()._initTabEvent()._initArticleHeight();
		},
		/**
		 * 初始化文档高度 
		 */
		_initArticleHeight: function() {
			var self = this,
				lastArticle = self.$article.last();
			var lastArticleHeight = lastArticle.height(),
				contHeight = self.$cont.height();
			if(lastArticleHeight < contHeight) {
				//outHeight()包含padding-top和padding-bottom和border-top和border-bottom的高度。
				self.$corret[0].style.height = contHeight - lastArticleHeight - self.$anchor.outerHeight() + "px";
			}
			return self;
		},
		/**
		 * 初始化滑块拖动功能
		 */
		_initSliderDragEvent: function() {
			var self = this;
			var slider = this.$slider,
				sliderEl = slider[0];
			if(sliderEl) {
				var doc = self.$doc,
					dragStartPagePosition,
					dragStartScrollPosition,
					dragContBarRate;

				function mousemoveHandler(e) {
					e.preventDefault;
					if(dragStartPagePosition == null) {
						return;
					}
					//console.log(dragStartScrollPosition);
					//console.log(e.pageY);
					//console.log(dragContBarRate);
					//console.log(dragStartScrollPosition + (e.pageY - dragStartPagePosition) * dragContBarRate);
					self.scrollTo(dragStartScrollPosition + (e.pageY - dragStartPagePosition) * dragContBarRate);
				}
				slider.on("mousedown", function(e) {
					//因为事件的默认行为往往会导致一些不可预测的结果，所以我们通过preventDefault把事件的默认行为阻止掉。
					e.preventDefault();
					//鼠标当前位置
					dragStartPagePosition = e.pageY;
					//内容区滚动的距离
					dragStartScrollPosition = self.$cont[0].scrollTop;
					dragContBarRate = self.getMaxScrollPosition() / self.getMaxSliderPosition();
					doc.on("mousemove.scroll", mousemoveHandler)
						.on("mouseup.scroll", function() {
							//解除事件绑定
							//console.log("mouseup");
							//这个会把document上的所有mousemove mouseup方法解除绑定，这必然会存在一定的风险。===为了解决这个风险我们给事件添加命名空间，
							//具体可以查看on和off的相关说明
							//doc.off("mousemove mouseup");
							//通过命名空间移出绑定的事件
							doc.off(".scroll");
						});
				});
			}
			return self;
		},
		/**
		 * 初始化标签切换功能 
		 */
		_initTabEvent: function() {
			var self = this;
			self.$tabItem.on("click", function(e) {
				e.preventDefault();
				var index = $(this).index();
				self.changeTabSelect(index);
				//已经滚出可视区的内容高度
				//+指定锚点与内容容器的距离
				self.scrollTo(self.$cont[0].scrollTop + self.getAnchorPosition(index));
			});
			return self;
		},
		//切换标签的选中
		changeTabSelect: function(index) {
			var self = this,
				active = self.options.tabActiveClass;
			return self.$tabItem.eq(index).addClass(active).siblings().removeClass(active);
		},
		//获取指定锚点到上边界的像素值
		//position() 获取匹配元素中第一个元素的当前位置，相对于离该元素最近且被定位过的父元素（relative，absolute，fixed）
		//position(coordinates)设置匹配的元素集合中每一个元素的坐标，坐标相对于文档如：{x：10，y：20}
		getAnchorPosition: function(index) {
			return this.$anchor.eq(index).position().top;
		},
		//获取每个锚点位置信息的数组
		getAllAnchorPostion: function() {
			var self = this,
				allPositionArr = [];
			for(var i = 0; i < self.$anchor.length; i++) {
				allPositionArr.push(self.$cont[0].scrollTop + self.getAnchorPosition(i));
			}
			return allPositionArr;
		},
		//监听内容的滚动，同步滑块的位置
		_bindContScroll: function() {
			var self = this;
			self.$cont.on("scroll", function() {
				var sliderEl = self.$slider && self.$slider[0];
				if(sliderEl) {
					sliderEl.style.top = self.getSliderPosition() + "px";
				}
			});
			return self;
		},
		_bindMousewheel: function() {
			var self = this;
			self.$cont.on("mousewheel DOMMouseScroll", function(e) {
				e.preventDefault();
				var oEv = e.originalEvent,
					wheelRange = oEv.wheelDelta ? -oEv.wheelDelta / 120 : (oEv.detail || 0) / 3;
				self.scrollTo(self.$cont[0].scrollTop + wheelRange * self.options.wheelStep);
			});
			return self;
		},
		//计算滑块的当前位置
		getSliderPosition: function() {
			var self = this,
				maxSliderPosition = self.getMaxSliderPosition();
			return Math.min(maxSliderPosition, maxSliderPosition * self.$cont[0].scrollTop / self.getMaxScrollPosition());
		},
		//内容可滚动的高度
		getMaxScrollPosition: function() {
			var self = this;
			//self.$cont[0].scrollHeight内容的整体高度
			//$cont.height()文档可视区的高度
			//console.log(self.$cont.height());
			//console.log(self.$cont[0].scrollHeight);
			//以下求max是为了解决的内容的整体高度小于可视区时，取最大的值作为内容的整体高度
			//这里有点没弄明白，当内容的整体高度小于可视区时，测试的结果self.$cont.height()和self.$cont[0].scrollHeight相同均为可视区高度
			return Math.max(self.$cont.height(), self.$cont[0].scrollHeight) - self.$cont.height();
		},
		//滑块可移动的距离
		getMaxSliderPosition: function() {
			var self = this;
			return self.$bar.height() - self.$slider.height();
		},
		scrollTo: function(positionVal) {
			var self = this;
			var posArr = self.getAllAnchorPostion();
			//滚动条的位置与tab标签的对应
			function getIndex(positionVal) {
				for(var i = posArr.length - 1; i >= 0; i--) {
					if(positionVal >= posArr[i]) {
						return i;
					} else {
						continue;
					}
				};
			}
			//锚点数与标签数相同
			if(posArr.length == self.$tabItem.length) {
				self.changeTabSelect(getIndex(positionVal));
			}
			self.$cont.scrollTop(positionVal);
		}
	});
	win.CusScrollBar = CusScrollBar;
})(window, document, jQuery);

//测试代码
var temp = new CusScrollBar({
	contSelector: ".scroll-cont", //滚动内容区选择器
	barSelector: ".scroll-bar", //滚动条选择器
	sliderSelector: ".scroll-slider", //滚动滑块选择器
	wheelStep: 10 //滚轮步长
});